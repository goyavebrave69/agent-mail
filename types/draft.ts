export type DraftStatus = 'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'

export interface Draft {
  id: string
  email_id: string
  user_id: string
  content: string
  status: DraftStatus
  confidence_score: number | null
  error_message: string | null
  retry_count: number
  sent_at?: string | null
  created_at: string
  updated_at: string
}
