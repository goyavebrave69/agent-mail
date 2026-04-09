'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaProvider } from '@/lib/email/send'
import type { SendEmailResult } from '@/lib/email/send'
import type { Draft } from '@/types/draft'

export interface EmailDetail {
  id: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  received_at: string
  is_read: boolean
  body_text: string | null
  response_type: 'text_reply' | 'pdf_required' | 'unknown'
}

export interface RejectDraftResult {
  success: boolean
  error?: string
}

export interface CreateDraftResult {
  success: boolean
  error?: string
}

// ─── Read helpers (called from Server Components) ────────────────────────────

export async function fetchEmail(emailId: string): Promise<EmailDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('emails')
    .select('id, subject, from_email, from_name, received_at, is_read, body_text, response_type')
    .eq('id', emailId)
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data as EmailDetail
}

export async function fetchDraftForEmail(emailId: string): Promise<Draft | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: draft, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('email_id', emailId)
    .eq('user_id', user.id)
    .single()

  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return draft as Draft
}

// ─── Send draft ───────────────────────────────────────────────────────────────

export async function validateAndSendDraft(
  draftId: string,
  editedContent?: string
): Promise<SendEmailResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.', errorCode: 'UNKNOWN' }

  const { data: draft, error: draftError } = await supabase
    .from('drafts')
    .select('id, status, content, emails!inner(id, provider, provider_email_id, subject, from_email)')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (draftError || !draft) {
    return { success: false, error: 'Draft not found.', errorCode: 'UNKNOWN' }
  }

  if (draft.status !== 'ready') {
    return { success: false, error: 'Draft is not ready to send.', errorCode: 'UNKNOWN' }
  }

  const email = draft.emails as unknown as {
    id: string
    provider: string
    provider_email_id: string | null
    subject: string | null
    from_email: string | null
  }
  const content = editedContent ?? draft.content

  const { data: connection } = await supabase
    .from('email_connections')
    .select('provider, email, vault_secret_id')
    .eq('user_id', user.id)
    .eq('provider', email.provider)
    .single()

  if (!connection) {
    return {
      success: false,
      error: 'No email connection found. Please reconnect your mailbox.',
      errorCode: 'NO_CONNECTION',
    }
  }

  const adminClient = createAdminClient()
  const { data: secretData } = await adminClient.rpc('read_vault_secret', {
    secret_id: connection.vault_secret_id,
  })
  const credentials = JSON.parse(secretData as string)

  const sendResult = await sendEmailViaProvider(
    connection.provider as 'gmail' | 'outlook' | 'imap',
    credentials,
    {
      to: email.from_email ?? '',
      from: connection.email,
      subject: `Re: ${email.subject ?? ''}`,
      body: content,
      replyToMessageId: email.provider_email_id ?? undefined,
    }
  )

  if (!sendResult.success) return sendResult

  // Optimistic lock: only mark sent if status is still 'ready'
  const { data: updatedDraft } = await supabase
    .from('drafts')
    .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .select()
    .single()

  if (!updatedDraft) {
    return {
      success: false,
      error: 'Draft was already processed. Please refresh the page.',
      errorCode: 'UNKNOWN',
    }
  }

  await supabase
    .from('emails')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', email.id)
    .eq('user_id', user.id)
    .eq('is_archived', false)

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${email.id}`)
  return { success: true }
}

// ─── Edit draft content ───────────────────────────────────────────────────────

export async function updateDraftContent(
  draftId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const sanitized = content.trim()
  if (!sanitized) {
    return { success: false, error: 'Draft content cannot be empty.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data } = await supabase
    .from('drafts')
    .update({ content: sanitized, updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .select()
    .single()

  if (!data) {
    return { success: false, error: 'Draft not found or no longer editable.' }
  }

  revalidatePath('/inbox')
  return { success: true }
}

// ─── Regenerate draft ─────────────────────────────────────────────────────────

export async function regenerateDraft(
  draftId: string,
  instruction: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: draft, error: draftError } = await supabase
    .from('drafts')
    .select('id, email_id, status, regeneration_count')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (draftError || !draft) {
    return { success: false, error: 'Draft not found.' }
  }

  const regenerationCount = (draft.regeneration_count as number) ?? 0
  if (regenerationCount >= 5) {
    return { success: false, error: 'Maximum regeneration limit reached for this draft.' }
  }

  const trimmedInstruction = instruction?.trim() || null

  await supabase
    .from('drafts')
    .update({
      status: 'generating',
      generation_instruction: trimmedInstruction,
      regeneration_count: regenerationCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .in('status', ['ready', 'error'])

  const fnRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-draft`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        emailId: draft.email_id,
        userId: user.id,
        instruction: trimmedInstruction,
        isRegeneration: true,
      }),
    }
  )

  if (!fnRes.ok) {
    const contextBody = await fnRes.clone().text().catch(() => null)
    console.error('[generate-draft invoke][regenerate] error', {
      status: fnRes.status,
      statusText: fnRes.statusText,
      contextBody,
    })
    let message = `HTTP ${fnRes.status}`
    try {
      const parsed = JSON.parse(contextBody ?? '{}') as { error?: string; message?: string }
      message = parsed.error ?? parsed.message ?? message
    } catch {
      // keep default message
    }
    return { success: false, error: message }
  }

  revalidatePath('/inbox')
  return { success: true }
}

// ─── Reject draft ─────────────────────────────────────────────────────────────

export async function rejectDraft(draftId: string): Promise<RejectDraftResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: draft, error: fetchError } = await supabase
    .from('drafts')
    .select('id, status')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !draft) {
    return { success: false, error: 'Draft not found.' }
  }

  if (draft.status === 'sent' || draft.status === 'rejected') {
    return { success: false, error: 'Draft cannot be rejected in its current state.' }
  }

  const { error } = await supabase
    .from('drafts')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/inbox')
  return { success: true }
}

// ─── Create draft on demand ───────────────────────────────────────────────────

export async function createDraftOnDemand(emailId: string): Promise<CreateDraftResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: email } = await supabase
    .from('emails')
    .select('id')
    .eq('id', emailId)
    .eq('user_id', user.id)
    .single()

  if (!email) return { success: false, error: 'Email not found.' }

  const { data: existingDraft } = await supabase
    .from('drafts')
    .select('id, status, regeneration_count')
    .eq('email_id', emailId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingDraft) {
    if (existingDraft.status === 'generating') {
      return { success: false, error: 'A draft is already being generated for this email.' }
    }
    const regenCount = (existingDraft.regeneration_count as number) ?? 0
    if (regenCount >= 3) {
      return { success: false, error: 'Maximum de 3 brouillons atteint pour cet email.' }
    }
    await supabase
      .from('drafts')
      .update({
        status: 'generating',
        content: null,
        confidence_score: null,
        error_message: null,
        regeneration_count: regenCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDraft.id)
      .eq('user_id', user.id)
  } else {
    await supabase.from('drafts').insert({
      user_id: user.id,
      email_id: emailId,
      status: 'generating',
    })
  }

  const fnRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-draft`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ emailId, userId: user.id }),
    }
  )

  if (!fnRes.ok) {
    const contextBody = await fnRes.clone().text().catch(() => null)
    console.error('[generate-draft invoke][create-on-demand] error', {
      status: fnRes.status,
      statusText: fnRes.statusText,
      contextBody,
    })
    let message = `HTTP ${fnRes.status}`
    try {
      const parsed = JSON.parse(contextBody ?? '{}') as { error?: string; message?: string }
      message = parsed.error ?? parsed.message ?? message
    } catch {
      // keep default message
    }
    await supabase
      .from('drafts')
      .update({
        status: 'error',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('email_id', emailId)
      .eq('user_id', user.id)
    return { success: false, error: message }
  }

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${emailId}`)
  return { success: true }
}

// ─── Mark email as read ───────────────────────────────────────────────────────

export async function markEmailAsRead(
  emailId: string
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('emails')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('user_id', user.id)
    .eq('is_read', false) // no-op if already read
}

// ─── Archive email ────────────────────────────────────────────────────────────

export async function archiveEmail(
  emailId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('emails')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inbox')
  return { success: true }
}

// ─── Trash email ──────────────────────────────────────────────────────────────

export async function trashEmail(
  emailId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('emails')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', emailId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inbox')
  return { success: true }
}

// ─── Send manual reply ────────────────────────────────────────────────────────

export async function sendManualReply(
  emailId: string,
  content: string,
  overrides?: { to?: string; subject?: string; isForward?: boolean }
): Promise<SendEmailResult> {
  const sanitized = content.trim()
  if (!sanitized) {
    return { success: false, error: 'Reply content cannot be empty.', errorCode: 'UNKNOWN' }
  }
  if (sanitized.length > 10_000) {
    return { success: false, error: 'Reply content is too long (max 10 000 characters).', errorCode: 'UNKNOWN' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.', errorCode: 'UNKNOWN' }

  const { data: email, error: emailError } = await supabase
    .from('emails')
    .select('id, provider, provider_email_id, subject, from_email, user_id')
    .eq('id', emailId)
    .eq('user_id', user.id)
    .single()

  if (emailError || !email) {
    return { success: false, error: 'Email not found.', errorCode: 'UNKNOWN' }
  }

  const { data: connection } = await supabase
    .from('email_connections')
    .select('provider, email, vault_secret_id')
    .eq('user_id', user.id)
    .eq('provider', email.provider)
    .single()

  if (!connection) {
    return {
      success: false,
      error: 'No email connection found. Please reconnect your mailbox.',
      errorCode: 'NO_CONNECTION',
    }
  }

  const adminClient = createAdminClient()
  const { data: secretData } = await adminClient.rpc('read_vault_secret', {
    secret_id: connection.vault_secret_id,
  })
  const credentials = JSON.parse(secretData as string)

  const toAddress = overrides?.to?.trim() || email.from_email || ''
  const subject = overrides?.subject?.trim() || `Re: ${email.subject ?? ''}`
  const isForward = overrides?.isForward ?? false

  const sendResult = await sendEmailViaProvider(
    connection.provider as 'gmail' | 'outlook' | 'imap',
    credentials,
    {
      to: toAddress,
      from: connection.email,
      subject,
      body: sanitized,
      replyToMessageId: isForward ? undefined : (email.provider_email_id ?? undefined),
    }
  )

  if (!sendResult.success) return sendResult

  // Upsert draft record for history
  const { data: existingDraft } = await supabase
    .from('drafts')
    .select('id')
    .eq('email_id', emailId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingDraft) {
    await supabase
      .from('drafts')
      .update({
        content: sanitized,
        status: 'sent',
        confidence_score: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDraft.id)
  } else {
    await supabase.from('drafts').insert({
      user_id: user.id,
      email_id: emailId,
      content: sanitized,
      status: 'sent',
      confidence_score: null,
      sent_at: new Date().toISOString(),
    })
  }

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${emailId}`)
  return { success: true }
}
