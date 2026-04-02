import tls from 'node:tls'
import { ImapFlow } from 'imapflow'
import type { SendEmailParams, SendEmailResult } from './send'
import type { EmailMessage } from './types'

export interface ImapCredentials {
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

function smtpCommand(socket: tls.TLSSocket, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = ''

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      if (/\r\n$/.test(buffer)) {
        socket.off('data', onData)
        resolve(buffer)
      }
    }

    socket.on('data', onData)
    socket.write(command)
    socket.once('error', reject)
  })
}

function createSmtpMessage(credentials: ImapCredentials, params: SendEmailParams): string {
  const headers = [
    `From: ${params.from ?? credentials.username}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `Message-ID: <${crypto.randomUUID()}@${credentials.host}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ]

  if (params.replyToMessageId) {
    headers.push(`In-Reply-To: ${params.replyToMessageId}`)
    headers.push(`References: ${params.replyToMessageId}`)
  }

  return `${headers.join('\r\n')}\r\n\r\n${params.body}\r\n.`
}

export async function sendViaSmtp(
  credentials: ImapCredentials,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const host = credentials.host
  const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
    const client = tls.connect(
      {
        host,
        port: 465,
        servername: host,
      },
      () => resolve(client)
    )
    client.once('error', reject)
  })

  try {
    await smtpCommand(socket, '')
    await smtpCommand(socket, `EHLO ${host}\r\n`)
    await smtpCommand(socket, 'AUTH LOGIN\r\n')
    await smtpCommand(socket, `${Buffer.from(credentials.username).toString('base64')}\r\n`)
    await smtpCommand(socket, `${Buffer.from(credentials.password).toString('base64')}\r\n`)
    await smtpCommand(socket, `MAIL FROM:<${credentials.username}>\r\n`)
    await smtpCommand(socket, `RCPT TO:<${params.to}>\r\n`)
    await smtpCommand(socket, 'DATA\r\n')
    const message = createSmtpMessage(credentials, params)
    const response = await smtpCommand(socket, `${message}\r\n`)

    if (!response.startsWith('250')) {
      return {
        success: false,
        error: 'Email provider error. Please try again.',
        errorCode: 'PROVIDER_ERROR',
      }
    }

    await smtpCommand(socket, 'QUIT\r\n')

    const messageIdMatch = message.match(/Message-ID:\s*(.+)/i)
    return {
      success: true,
      messageId: messageIdMatch?.[1]?.trim(),
    }
  } catch {
    return {
      success: false,
      error: 'Email provider error. Please try again.',
      errorCode: 'PROVIDER_ERROR',
    }
  } finally {
    socket.end()
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

  const emails: EmailMessage[] = []
  let lock: { release: () => void } | null = null

  try {
    lock = await client.getMailboxLock('INBOX')

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
    lock?.release()
    await client.logout()
  }

  return { emails }
}
