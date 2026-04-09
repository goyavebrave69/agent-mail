import type { SendEmailParams, SendEmailResult } from './send'
import type { EmailMessage } from './types'

export interface GmailCredentials {
  access_token: string
  refresh_token: string
  email?: string
}

interface RefreshResult {
  access_token: string
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const BOUNDARY = '==MailAgentBoundary=='

function buildRfc2822Message(credentials: GmailCredentials, params: SendEmailParams): string {
  const hasAttachments = params.attachments && params.attachments.length > 0

  const headers = [
    `To: ${params.to}`,
    `From: ${params.from ?? credentials.email ?? 'me'}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
  ]

  if (params.replyToMessageId) {
    headers.push(`In-Reply-To: ${params.replyToMessageId}`)
    headers.push(`References: ${params.replyToMessageId}`)
  }

  if (!hasAttachments) {
    headers.push('Content-Type: text/plain; charset=UTF-8')
    return [...headers, '', params.body].join('\r\n')
  }

  // Multipart message with attachments
  headers.push(`Content-Type: multipart/mixed; boundary="${BOUNDARY}"`)
  const parts: string[] = [
    ...headers,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    params.body,
  ]

  for (const att of params.attachments!) {
    parts.push(`--${BOUNDARY}`)
    parts.push(`Content-Type: ${att.contentType}`)
    parts.push(`Content-Disposition: attachment; filename="${att.filename}"`)
    parts.push('Content-Transfer-Encoding: base64')
    parts.push('')
    // Chunk base64 at 76 chars per line (RFC 2045)
    const b64 = att.contentBase64
    for (let i = 0; i < b64.length; i += 76) {
      parts.push(b64.slice(i, i + 76))
    }
  }

  parts.push(`--${BOUNDARY}--`)
  return parts.join('\r\n')
}

/**
 * Parse "Display Name <email@example.com>" or plain "email@example.com"
 */
function parseFrom(raw: string | undefined): { fromEmail: string | null; fromName: string | null } {
  if (!raw) return { fromEmail: null, fromName: null }
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return { fromName: match[1].trim() || null, fromEmail: match[2].trim() }
  }
  return { fromEmail: raw.trim(), fromName: null }
}

function getHeaderValue(headers: Array<{ name: string; value: string }>, name: string): string | undefined {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value
}

async function refreshGmailToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status}`)
  }
  return res.json() as Promise<RefreshResult>
}

export async function sendViaGmail(
  credentials: GmailCredentials,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const raw = encodeBase64Url(buildRfc2822Message(credentials, params))

  const sendWithToken = async (accessToken: string): Promise<Response> =>
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    })

  let accessToken = credentials.access_token
  let response = await sendWithToken(accessToken)

  if (response.status === 401 || response.status === 403) {
    console.error('[sendViaGmail] token rejected, attempting refresh', { status: response.status })
    try {
      const refreshed = await refreshGmailToken(credentials.refresh_token)
      accessToken = refreshed.access_token
      response = await sendWithToken(accessToken)
    } catch (refreshErr) {
      console.error('[sendViaGmail] token refresh failed', refreshErr)
      return { success: false, error: 'Gmail token refresh failed. Please reconnect your mailbox.', errorCode: 'PROVIDER_ERROR' }
    }
  }

  if (!response.ok) {
    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before retrying.',
        errorCode: 'RATE_LIMIT',
      }
    }

    const errorBody = await response.text().catch(() => '(unreadable)')
    console.error('[sendViaGmail] send failed', { status: response.status, body: errorBody })
    let detail = ''
    try {
      const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
      detail = parsed?.error?.message ? ` (${parsed.error.message})` : ''
    } catch { /* ignore */ }
    return {
      success: false,
      error: `Gmail error ${response.status}${detail}`,
      errorCode: 'PROVIDER_ERROR',
    }
  }

  const data = await response.json() as { id?: string }
  return { success: true, messageId: data.id }
}

async function listMessageIds(accessToken: string, after: number): Promise<string[]> {
  const query = after > 0 ? `after:${after}` : ''
  let pageToken: string | null = null
  const messageIds: string[] = []

  do {
    const params = new URLSearchParams()
    if (query) {
      params.set('q', query)
    }
    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages${params.size > 0 ? `?${params.toString()}` : ''}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const err = new Error(`Gmail list messages failed: ${res.status}`) as Error & { status: number }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>
      nextPageToken?: string
    }

    messageIds.push(...(data.messages?.map(m => m.id) ?? []))
    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return messageIds
}

async function fetchMessageMetadata(
  accessToken: string,
  messageId: string
): Promise<EmailMessage | null> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    id: string
    payload?: { headers?: Array<{ name: string; value: string }> }
    internalDate?: string
  }

  const headers = data.payload?.headers ?? []
  const subject = getHeaderValue(headers, 'Subject') ?? null
  const { fromEmail, fromName } = parseFrom(getHeaderValue(headers, 'From'))
  const dateHeader = getHeaderValue(headers, 'Date')
  const receivedAt = dateHeader
    ? new Date(dateHeader)
    : data.internalDate
      ? new Date(Number(data.internalDate))
      : new Date()

  return {
    providerEmailId: data.id,
    subject,
    fromEmail,
    fromName,
    receivedAt,
  }
}

/**
 * Fetch new emails from Gmail since lastSyncedAt.
 * On 401, attempts token refresh once using the stored refresh_token.
 * Returns the refreshed access_token so the caller can persist it.
 */
export async function fetchNewEmails(
  credentials: GmailCredentials,
  lastSyncedAt: Date | null
): Promise<{ emails: EmailMessage[]; newAccessToken?: string }> {
  const after = lastSyncedAt ? Math.floor(lastSyncedAt.getTime() / 1000) : 0
  let { access_token } = credentials

  let messageIds: string[]
  try {
    messageIds = await listMessageIds(access_token, after)
  } catch (e) {
    const err = e as Error & { status?: number }
    if (err.status === 401) {
      // Token expired — refresh and retry once
      const refreshed = await refreshGmailToken(credentials.refresh_token)
      access_token = refreshed.access_token
      messageIds = await listMessageIds(access_token, after)
    } else {
      throw e
    }
  }

  const newAccessToken = access_token !== credentials.access_token ? access_token : undefined

  if (messageIds.length === 0) {
    return { emails: [], newAccessToken }
  }

  const results = await Promise.all(
    messageIds.map(id => fetchMessageMetadata(access_token, id))
  )

  const emails = results.filter((m): m is EmailMessage => m !== null)
  return { emails, newAccessToken }
}
