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

async function outlookFetch(
  url: string,
  accessToken: string,
  body: object | null
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body !== null && { body: JSON.stringify(body) }),
  })
}

async function withTokenRefresh(
  credentials: OutlookCredentials,
  call: (token: string) => Promise<Response>
): Promise<{ response: Response; accessToken: string }> {
  let accessToken = credentials.access_token
  let response = await call(accessToken)

  if (response.status === 401 || response.status === 403) {
    console.error('[sendViaOutlook] token rejected, attempting refresh', { status: response.status })
    try {
      const refreshed = await refreshOutlookToken(credentials.refresh_token)
      accessToken = refreshed.access_token
      response = await call(accessToken)
    } catch (refreshErr) {
      console.error('[sendViaOutlook] token refresh failed', refreshErr)
      throw new Error('REFRESH_FAILED')
    }
  }

  return { response, accessToken }
}

async function handleOutlookError(response: Response, label: string): Promise<SendEmailResult> {
  if (response.status === 429) {
    return { success: false, error: 'Rate limit exceeded. Please wait a moment before retrying.', errorCode: 'RATE_LIMIT' }
  }
  const errorBody = await response.text().catch(() => '(unreadable)')
  console.error(`[${label}] send failed`, { status: response.status, body: errorBody })
  let detail = ''
  try {
    const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
    detail = parsed?.error?.message ? ` (${parsed.error.message})` : ''
  } catch { /* ignore */ }
  return { success: false, error: `Outlook error ${response.status}${detail}`, errorCode: 'PROVIDER_ERROR' }
}

export async function sendViaOutlook(
  credentials: OutlookCredentials,
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    // For replies: use the /reply endpoint so Outlook handles threading natively.
    // For new messages / forwards: use /sendMail.
    if (params.replyToMessageId) {
      const { response } = await withTokenRefresh(credentials, (token) =>
        outlookFetch(
          `https://graph.microsoft.com/v1.0/me/messages/${params.replyToMessageId}/reply`,
          token,
          { comment: params.body }
        )
      )
      if (!response.ok) return handleOutlookError(response, 'sendViaOutlook/reply')
      return { success: true, messageId: crypto.randomUUID() }
    }

    // New compose or forward
    const message = {
      subject: params.subject,
      body: { contentType: 'Text', content: params.body },
      toRecipients: [{ emailAddress: { address: params.to } }],
    }
    const { response } = await withTokenRefresh(credentials, (token) =>
      outlookFetch('https://graph.microsoft.com/v1.0/me/sendMail', token, { message })
    )
    if (!response.ok) return handleOutlookError(response, 'sendViaOutlook/sendMail')
    return { success: true, messageId: crypto.randomUUID() }
  } catch (err) {
    if (err instanceof Error && err.message === 'REFRESH_FAILED') {
      return { success: false, error: 'Outlook token refresh failed. Please reconnect your mailbox.', errorCode: 'PROVIDER_ERROR' }
    }
    throw err
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
