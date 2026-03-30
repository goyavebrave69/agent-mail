export interface EmailMessage {
  providerEmailId: string
  subject: string | null
  fromEmail: string | null
  fromName: string | null
  receivedAt: Date
}
