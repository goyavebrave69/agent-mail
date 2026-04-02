import { createClient } from '@/lib/supabase/server'
import type { Draft } from '@/types/draft'

export interface EmailDetail {
  id: string
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
    .select('id, subject, from_email, from_name, received_at, is_read, body_text')
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
