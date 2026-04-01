'use server'

import { revalidatePath } from 'next/cache'
import {
  sendEmailViaProvider,
  type ProviderCredentials,
  type SendEmailErrorCode,
} from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Draft } from '@/types/draft'

export interface EmailDetail {
  id: string
  provider?: 'gmail' | 'outlook' | 'imap'
  provider_email_id?: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  received_at: string
  is_read: boolean
  body_text: string | null
}

export async function fetchEmail(emailId: string): Promise<EmailDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('emails')
    .select('id, provider, provider_email_id, subject, from_email, from_name, received_at, is_read, body_text')
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

  // No draft yet — normal for emails awaiting pipeline
  if (error?.code === 'PGRST116') return null
  if (error) throw error

  return draft as Draft
}

interface SendDraftResult {
  success: boolean
  error?: string
  errorCode?: SendEmailErrorCode
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

function buildReplySubject(subject: string | null): string {
  if (!subject) return 'Re:'
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`
}

function getUserMessageForCode(errorCode: SendEmailErrorCode | undefined): string {
  switch (errorCode) {
    case 'NO_CONNECTION':
      return 'No email connection found. Please reconnect your mailbox.'
    case 'RATE_LIMIT':
      return 'Rate limit exceeded. Please wait a moment before retrying.'
    case 'PROVIDER_ERROR':
      return 'Email provider error. Please try again.'
    default:
      return 'Failed to send email. Please try again.'
  }
}

export async function updateDraftContent(
  draftId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const sanitizedContent = stripHtml(newContent)
  if (sanitizedContent.length < 1) {
    return { success: false, error: 'Draft content cannot be empty.' }
  }
  if (sanitizedContent.length > 10000) {
    return { success: false, error: 'Draft content cannot exceed 10000 characters.' }
  }

  const { data: updatedDraft, error } = await supabase
    .from('drafts')
    .update({
      content: sanitizedContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .select('id')
    .single()

  if (error || !updatedDraft) {
    return { success: false, error: 'Unable to save draft edits.' }
  }

  revalidatePath('/inbox')
  return { success: true }
}

export async function validateAndSendDraft(
  draftId: string,
  editedContent?: string
): Promise<SendDraftResult> {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized', errorCode: 'UNKNOWN' }
  }

  const { data: draft, error: draftError } = await supabase
    .from('drafts')
    .select(`
      id,
      user_id,
      email_id,
      content,
      status,
      emails (
        id,
        provider,
        provider_email_id,
        subject,
        from_email
      )
    `)
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (draftError || !draft) {
    return { success: false, error: 'Draft not found.', errorCode: 'UNKNOWN' }
  }

  const email = Array.isArray(draft.emails) ? draft.emails[0] : draft.emails
  if (!email || draft.status !== 'ready' || !draft.content) {
    return { success: false, error: 'Draft is not ready to send.', errorCode: 'UNKNOWN' }
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
      error: getUserMessageForCode('NO_CONNECTION'),
      errorCode: 'NO_CONNECTION',
    }
  }

  const { data: rawSecret } = await adminClient.rpc('read_vault_secret', {
    secret_id: connection.vault_secret_id,
  })

  if (!rawSecret) {
    return {
      success: false,
      error: getUserMessageForCode('NO_CONNECTION'),
      errorCode: 'NO_CONNECTION',
    }
  }

  const contentToSend = editedContent ? stripHtml(editedContent) : draft.content
  if (!contentToSend) {
    return { success: false, error: 'Draft content cannot be empty.', errorCode: 'UNKNOWN' }
  }

  const credentials = JSON.parse(rawSecret as string) as ProviderCredentials
  const result = await sendEmailViaProvider(email.provider, credentials, {
    to: email.from_email ?? connection.email,
    from: connection.email,
    subject: buildReplySubject(email.subject),
    body: contentToSend,
    replyToMessageId: email.provider_email_id,
  })

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? getUserMessageForCode(result.errorCode),
      errorCode: result.errorCode ?? 'UNKNOWN',
    }
  }

  const now = new Date().toISOString()
  const { data: updatedDraft, error: updateDraftError } = await supabase
    .from('drafts')
    .update({
      content: contentToSend,
      status: 'sent',
      sent_at: now,
      updated_at: now,
      error_message: null,
    })
    .eq('id', draft.id)
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .select('id')
    .single()

  if (updateDraftError || !updatedDraft) {
    return {
      success: false,
      error: 'Draft was already processed. Please refresh the page.',
      errorCode: 'UNKNOWN',
    }
  }

  await supabase
    .from('emails')
    .update({ is_archived: true })
    .eq('id', email.id)
    .eq('user_id', user.id)

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${email.id}`)

  return { success: true }
}
