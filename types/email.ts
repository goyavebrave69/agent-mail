export type EmailCategory = string

export interface EmailMessage {
  id: string
  user_id: string
  connection_id: string
  provider_message_id: string
  subject: string
  from_address: string
  received_at: string
  category: EmailCategory
  priority_rank: number
  is_read: boolean
  is_archived: boolean
  created_at: string
}
