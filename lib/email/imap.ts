import { ImapFlow } from 'imapflow'
import type { EmailMessage } from './types'

interface ImapCredentials {
  host: string
  port: number
  username: string
  password: string
}

interface FetchedEnvelope {
  uid: number
  envelope?: {
    messageId?: string
    subject?: string
    from?: Array<{ name?: string; address?: string }>
    date?: Date
  }
}

/**
 * Fetch new emails via IMAP since lastSyncedAt.
 * Uses ImapFlow (imapflow ^1.2.18) — already installed from story 2.3.
 * Fetches envelope only — no body download (NFR8).
 */
export async function fetchNewEmails(
  credentials: ImapCredentials,
  lastSyncedAt: Date | null
): Promise<{ emails: EmailMessage[] }> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.port === 993,
    doSTARTTLS: credentials.port === 143,
    auth: {
      user: credentials.username,
      pass: credentials.password,
    },
    logger: false,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
  })

  await client.connect()

  const lock = await client.getMailboxLock('INBOX')
  const emails: EmailMessage[] = []

  try {
    const searchCriteria: { since?: Date } = {}
    if (lastSyncedAt) {
      searchCriteria.since = lastSyncedAt
    }

    const searchResult = await client.search(lastSyncedAt ? { since: lastSyncedAt } : { all: true })
    const uids: number[] = searchResult === false ? [] : searchResult

    if (uids.length > 0) {
      for await (const msg of client.fetch(uids, { envelope: true }) as AsyncIterable<FetchedEnvelope>) {
        const env = msg.envelope
        if (!env) continue

        const from = env.from?.[0]
        emails.push({
          providerEmailId: env.messageId ?? String(msg.uid),
          subject: env.subject ?? null,
          fromEmail: from?.address ?? null,
          fromName: from?.name ?? null,
          receivedAt: env.date ?? new Date(),
        })
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }

  return { emails }
}
