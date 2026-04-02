import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSendViaGmail = vi.fn()
const mockSendViaOutlook = vi.fn()
const mockSendViaSmtp = vi.fn()

vi.mock('./gmail', () => ({
  sendViaGmail: mockSendViaGmail,
}))

vi.mock('./outlook', () => ({
  sendViaOutlook: mockSendViaOutlook,
}))

vi.mock('./imap', () => ({
  sendViaSmtp: mockSendViaSmtp,
}))

describe('sendEmailViaProvider', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('routes Gmail sends to the Gmail provider', async () => {
    mockSendViaGmail.mockResolvedValue({ success: true, messageId: 'gmail-1' })
    const { sendEmailViaProvider } = await import('./send')

    const result = await sendEmailViaProvider(
      'gmail',
      { access_token: 'token', refresh_token: 'refresh' },
      { to: 'user@example.com', subject: 'Re: Hello', body: 'Thanks' }
    )

    expect(mockSendViaGmail).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, messageId: 'gmail-1' })
  })

  it('routes Outlook sends to the Outlook provider', async () => {
    mockSendViaOutlook.mockResolvedValue({ success: true, messageId: 'outlook-1' })
    const { sendEmailViaProvider } = await import('./send')

    const result = await sendEmailViaProvider(
      'outlook',
      { access_token: 'token', refresh_token: 'refresh' },
      { to: 'user@example.com', subject: 'Re: Hello', body: 'Thanks' }
    )

    expect(mockSendViaOutlook).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, messageId: 'outlook-1' })
  })

  it('routes IMAP sends to SMTP transport', async () => {
    mockSendViaSmtp.mockResolvedValue({ success: true, messageId: 'smtp-1' })
    const { sendEmailViaProvider } = await import('./send')

    const result = await sendEmailViaProvider(
      'imap',
      { host: 'imap.example.com', port: 993, username: 'user@example.com', password: 'secret' },
      { to: 'user@example.com', subject: 'Re: Hello', body: 'Thanks' }
    )

    expect(mockSendViaSmtp).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: true, messageId: 'smtp-1' })
  })

  it('returns a no-connection error when credentials are missing', async () => {
    const { sendEmailViaProvider } = await import('./send')

    const result = await sendEmailViaProvider(
      'gmail',
      undefined as never,
      { to: 'user@example.com', subject: 'Re: Hello', body: 'Thanks' }
    )

    expect(result).toEqual({
      success: false,
      error: 'No email credentials found.',
      errorCode: 'NO_CONNECTION',
    })
  })
})
