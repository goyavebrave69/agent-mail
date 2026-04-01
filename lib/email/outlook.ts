import type { SendEmailParams, SendEmailResult } from './send'
import type { EmailMessage } from './types'

export interface OutlookCredentials {
  access_token: string
  refresh_token: string
  email?: string
}

interface RefreshResult {
  access_token: string
}

interface GraphMessage {
  id: string
  subject?: string
  from?: {
    emailAddress?: {
      name?: string
      address?: string
    }
  }
  receivedDateTime?: string
}

async function refreshOutlookToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access',
    }),
  })
  if (!res.ok) {
    throw new Error(`Outlook token refresh failed: ${res.status}`)
  }
  return res.json() as Promise<RefreshResult>
}

export async function sendViaOutlook(
  credentials: OutlookCredentials,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const message = {
    subject: params.subject,
    body: {
      contentType: 'Text',
      content: params.body,
    },
    toRecipients: [
      {
        emailAddress: {
          address: params.to,
        },
      },
    ],
    internetMessageHeaders: params.replyToMessageId
      ? [
          { name: 'In-Reply-To', value: params.replyToMessageId },
          { name: 'References', value: params.replyToMessageId },
        ]
      : undefined,
  }

  const sendWithToken = async (accessToken: string): Promise<Response> =>
    fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })

  let accessToken = credentials.access_token
  let response = await sendWithToken(accessToken)

  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshOutlookToken(credentials.refresh_token)
    accessToken = refreshed.access_token
    response = await sendWithToken(accessToken)
  }

  if (!response.ok) {
    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before retrying.',
        errorCode: 'RATE_LIMIT',
      }
    }

    return {
      success: false,
      error: 'Email provider error. Please try again.',
      errorCode: 'PROVIDER_ERROR',
    }
  }

  return {
    success: true,
    messageId: crypto.randomUUID(),
  }
}

async function listMessages(accessToken: string, lastSyncedAt: Date | null): Promise<GraphMessage[]> {
  const select = '$select=id,subject,from,receivedDateTime'
  const filter = lastSyncedAt
    ? `&$filter=receivedDateTime gt ${lastSyncedAt.toISOString()}`
    : ''
  let nextUrl: string | null = `https://graph.microsoft.com/v1.0/me/messages?${select}${filter}&$top=50`
  const messages: GraphMessage[] = []

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const err = new Error(`Outlook list messages failed: ${res.status}`) as Error & { status: number }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as { value?: GraphMessage[]; '@odata.nextLink'?: string }
    messages.push(...(data.value ?? []))
    nextUrl = data['@odata.nextLink'] ?? null
  }

  return messages
}

function toEmailMessage(msg: GraphMessage): EmailMessage {
  return {
    providerEmailId: msg.id,
    subject: msg.subject ?? null,
    fromEmail: msg.from?.emailAddress?.address ?? null,
    fromName: msg.from?.emailAddress?.name ?? null,
    receivedAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date(),
  }
}

/**
 * Fetch new emails from Outlook/Microsoft 365 since lastSyncedAt.
 * On 401, attempts token refresh once.
 */
export async function fetchNewEmails(
  credentials: OutlookCredentials,
  lastSyncedAt: Date | null
): Promise<{ emails: EmailMessage[]; newAccessToken?: string }> {
  let { access_token } = credentials

  let messages: GraphMessage[]
  try {
    messages = await listMessages(access_token, lastSyncedAt)
  } catch (e) {
    const err = e as Error & { status?: number }
    if (err.status === 401) {
      const refreshed = await refreshOutlookToken(credentials.refresh_token)
      access_token = refreshed.access_token
      messages = await listMessages(access_token, lastSyncedAt)
    } else {
      throw e
    }
  }

  const emails = messages.map(toEmailMessage)
  const newAccessToken = access_token !== credentials.access_token ? access_token : undefined
  return { emails, newAccessToken }
}
