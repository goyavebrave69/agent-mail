import { sendViaGmail, type GmailCredentials } from './gmail'
import { sendViaSmtp, type ImapCredentials } from './imap'
import { sendViaOutlook, type OutlookCredentials } from './outlook'

export interface EmailAttachment {
  filename: string
  contentBase64: string
  contentType: string
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  from?: string
  replyToMessageId?: string
  attachments?: EmailAttachment[]
}

export type SendEmailErrorCode = 'PROVIDER_ERROR' | 'NO_CONNECTION' | 'RATE_LIMIT' | 'UNKNOWN'

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: SendEmailErrorCode
}

export type ProviderCredentials = GmailCredentials | OutlookCredentials | ImapCredentials

export async function sendEmailViaProvider(
  provider: 'gmail' | 'outlook' | 'imap',
  credentials: ProviderCredentials,
  params: SendEmailParams
): Promise<SendEmailResult> {
  if (!credentials) {
    return {
      success: false,
      error: 'No email credentials found.',
      errorCode: 'NO_CONNECTION',
    }
  }

  switch (provider) {
    case 'gmail':
      return sendViaGmail(credentials as GmailCredentials, params)
    case 'outlook':
      return sendViaOutlook(credentials as OutlookCredentials, params)
    case 'imap':
      return sendViaSmtp(credentials as ImapCredentials, params)
    default:
      return {
        success: false,
        error: `Unsupported provider: ${provider satisfies never}`,
        errorCode: 'UNKNOWN',
      }
  }
}
