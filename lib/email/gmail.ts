import type { EmailMessage } from './types'

interface GmailCredentials {
  access_token: string
  refresh_token: string
  email?: string
}

interface RefreshResult {
  access_token: string
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
