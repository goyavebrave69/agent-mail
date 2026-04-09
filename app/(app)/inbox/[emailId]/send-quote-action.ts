'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaProvider } from '@/lib/email/send'
import { revalidatePath } from 'next/cache'

export interface SendQuoteResult {
  success: boolean
  error?: string
}

export async function sendQuoteAction(
  emailId: string,
  attachment: { filename: string; contentBase64: string; contentType: string },
  emailSubject: string
): Promise<SendQuoteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { data: email, error: emailError } = await supabase
    .from('emails')
    .select('id, provider, provider_email_id, subject, from_email')
    .eq('id', emailId)
    .eq('user_id', user.id)
    .single()

  if (emailError || !email) return { success: false, error: 'Email not found.' }

  const { data: connection } = await supabase
    .from('email_connections')
    .select('provider, email, vault_secret_id')
    .eq('user_id', user.id)
    .eq('provider', email.provider)
    .single()

  if (!connection) {
    return { success: false, error: 'No email connection found. Please reconnect your mailbox.' }
  }

  const adminClient = createAdminClient()
  const { data: secretData } = await adminClient.rpc('read_vault_secret', {
    secret_id: connection.vault_secret_id,
  })
  const credentials = JSON.parse(secretData as string) as unknown

  const result = await sendEmailViaProvider(
    connection.provider as 'gmail' | 'outlook' | 'imap',
    credentials as Parameters<typeof sendEmailViaProvider>[1],
    {
      to: email.from_email ?? '',
      from: connection.email,
      subject: emailSubject,
      body: 'Veuillez trouver ci-joint notre devis. N\'hésitez pas à nous contacter pour toute question.',
      replyToMessageId: email.provider_email_id ?? undefined,
      attachments: [attachment],
    }
  )

  if (!result.success) return { success: false, error: result.error }

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${emailId}`)
  return { success: true }
}
