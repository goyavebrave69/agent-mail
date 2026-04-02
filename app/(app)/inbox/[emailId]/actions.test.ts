import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRevalidatePath = vi.fn()
const mockCreateClient = vi.fn()
const mockCreateAdminClient = vi.fn()
const mockSendEmailViaProvider = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock('@/lib/email/send', () => ({
  sendEmailViaProvider: mockSendEmailViaProvider,
}))

describe('validateAndSendDraft', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockDraftSingle: ReturnType<typeof vi.fn>
  let mockConnectionSingle: ReturnType<typeof vi.fn>
  let mockUpdatedDraftSingle: ReturnType<typeof vi.fn>
  let mockEmailUpdateEq: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>
  let mockRpc: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockDraftSingle = vi.fn()
    mockConnectionSingle = vi.fn()
    mockUpdatedDraftSingle = vi.fn()
    mockEmailUpdateEq = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockRpc = vi.fn()

    const draftQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockDraftSingle,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockUpdatedDraftSingle,
              }),
            }),
          }),
        }),
      }),
    }

    const connectionQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockConnectionSingle,
          }),
        }),
      }),
    }

    const emailsQuery = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEmailUpdateEq,
        }),
      }),
    }

    fromMock = vi.fn((table: string) => {
      if (table === 'drafts') return draftQuery
      if (table === 'email_connections') return connectionQuery
      if (table === 'emails') return emailsQuery
      throw new Error(`Unexpected table: ${table}`)
    })

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: fromMock,
    })

    mockCreateAdminClient.mockReturnValue({
      rpc: mockRpc,
    })
  })

  it('sends edited content when provided', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'ready',
        content: 'Stored content',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })
    mockConnectionSingle.mockResolvedValue({
      data: { provider: 'gmail', email: 'me@example.com', vault_secret_id: 'vault-1' },
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }),
      error: null,
    })
    mockSendEmailViaProvider.mockResolvedValue({ success: true, messageId: 'sent-1' })
    mockUpdatedDraftSingle.mockResolvedValue({ data: { id: 'draft-1' }, error: null })

    const { validateAndSendDraft } = await import('./actions')
    await validateAndSendDraft('draft-1', 'Edited content')

    expect(mockSendEmailViaProvider).toHaveBeenCalledWith(
      'gmail',
      { access_token: 'token', refresh_token: 'refresh' },
      expect.objectContaining({ body: 'Edited content' })
    )
  })

  it('sends a ready draft, marks it sent, archives the email, and revalidates paths', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'ready',
        content: 'Thanks for your email.',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })
    mockConnectionSingle.mockResolvedValue({
      data: { provider: 'gmail', email: 'me@example.com', vault_secret_id: 'vault-1' },
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }),
      error: null,
    })
    mockSendEmailViaProvider.mockResolvedValue({ success: true, messageId: 'sent-1' })
    mockUpdatedDraftSingle.mockResolvedValue({ data: { id: 'draft-1' }, error: null })

    const { validateAndSendDraft } = await import('./actions')
    const result = await validateAndSendDraft('draft-1')

    expect(mockSendEmailViaProvider).toHaveBeenCalledWith(
      'gmail',
      { access_token: 'token', refresh_token: 'refresh' },
      expect.objectContaining({
        to: 'sender@example.com',
        from: 'me@example.com',
        subject: 'Re: Question',
        body: 'Thanks for your email.',
        replyToMessageId: '<msg@example.com>',
      })
    )
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox/email-1')
  })

  it('returns an error when draft is not ready', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'sent',
        content: 'Thanks',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })

    const { validateAndSendDraft } = await import('./actions')
    const result = await validateAndSendDraft('draft-1')

    expect(result).toEqual({
      success: false,
      error: 'Draft is not ready to send.',
      errorCode: 'UNKNOWN',
    })
    expect(mockSendEmailViaProvider).not.toHaveBeenCalled()
  })

  it('returns a no-connection error when mailbox connection is missing', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'ready',
        content: 'Thanks',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })
    mockConnectionSingle.mockResolvedValue({ data: null, error: null })

    const { validateAndSendDraft } = await import('./actions')
    const result = await validateAndSendDraft('draft-1')

    expect(result).toEqual({
      success: false,
      error: 'No email connection found. Please reconnect your mailbox.',
      errorCode: 'NO_CONNECTION',
    })
  })

  it('returns provider errors without updating the draft', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'ready',
        content: 'Thanks',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })
    mockConnectionSingle.mockResolvedValue({
      data: { provider: 'gmail', email: 'me@example.com', vault_secret_id: 'vault-1' },
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }),
      error: null,
    })
    mockSendEmailViaProvider.mockResolvedValue({
      success: false,
      error: 'Email provider error. Please try again.',
      errorCode: 'PROVIDER_ERROR',
    })

    const { validateAndSendDraft } = await import('./actions')
    const result = await validateAndSendDraft('draft-1')

    expect(result).toEqual({
      success: false,
      error: 'Email provider error. Please try again.',
      errorCode: 'PROVIDER_ERROR',
    })
    expect(mockUpdatedDraftSingle).not.toHaveBeenCalled()
  })

  it('prevents duplicate sends when the ready-status update no longer matches', async () => {
    mockDraftSingle.mockResolvedValue({
      data: {
        id: 'draft-1',
        status: 'ready',
        content: 'Thanks',
        emails: {
          id: 'email-1',
          provider: 'gmail',
          provider_email_id: '<msg@example.com>',
          subject: 'Question',
          from_email: 'sender@example.com',
        },
      },
      error: null,
    })
    mockConnectionSingle.mockResolvedValue({
      data: { provider: 'gmail', email: 'me@example.com', vault_secret_id: 'vault-1' },
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }),
      error: null,
    })
    mockSendEmailViaProvider.mockResolvedValue({ success: true, messageId: 'sent-1' })
    mockUpdatedDraftSingle.mockResolvedValue({ data: null, error: { message: 'stale row' } })

    const { validateAndSendDraft } = await import('./actions')
    const result = await validateAndSendDraft('draft-1')

    expect(result).toEqual({
      success: false,
      error: 'Draft was already processed. Please refresh the page.',
      errorCode: 'UNKNOWN',
    })
  })
})

describe('updateDraftContent', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockUpdatedDraftSingle: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpdatedDraftSingle = vi.fn()

    fromMock = vi.fn((table: string) => {
      if (table !== 'drafts') throw new Error(`Unexpected table: ${table}`)
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: mockUpdatedDraftSingle,
                }),
              }),
            }),
          }),
        }),
      }
    })

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: fromMock,
    })
  })

  it('updates ready draft content successfully', async () => {
    mockUpdatedDraftSingle.mockResolvedValue({ data: { id: 'draft-1' }, error: null })

    const { updateDraftContent } = await import('./actions')
    const result = await updateDraftContent('draft-1', 'Edited content')

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox')
  })

  it('rejects empty edited content', async () => {
    const { updateDraftContent } = await import('./actions')
    const result = await updateDraftContent('draft-1', '   ')

    expect(result).toEqual({
      success: false,
      error: 'Draft content cannot be empty.',
    })
  })
})

describe('regenerateDraft', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockDraftSingle: ReturnType<typeof vi.fn>
  let mockFunctionsInvoke: ReturnType<typeof vi.fn>
  let mockUpdateIn: ReturnType<typeof vi.fn>
  let mockUpdateEq: ReturnType<typeof vi.fn>
  let fromMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockDraftSingle = vi.fn()
    mockFunctionsInvoke = vi.fn()
    mockUpdateIn = vi.fn().mockResolvedValue({ error: null })
    mockUpdateEq = vi.fn().mockResolvedValue({ error: null })

    fromMock = vi.fn((table: string) => {
      if (table !== 'drafts') throw new Error(`Unexpected table: ${table}`)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockDraftSingle,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: mockUpdateIn,
              eq: mockUpdateEq,
            }),
          }),
        }),
      }
    })

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: fromMock,
      functions: {
        invoke: mockFunctionsInvoke,
      },
    })
  })

  it('updates draft to generating and invokes edge function with instruction', async () => {
    mockDraftSingle.mockResolvedValue({
      data: { id: 'draft-1', email_id: 'email-1', status: 'ready', regeneration_count: 0 },
      error: null,
    })
    mockFunctionsInvoke.mockResolvedValue({ error: null })

    const { regenerateDraft } = await import('./actions')
    const result = await regenerateDraft('draft-1', '  offer a 24h delay  ')

    expect(result).toEqual({ success: true })
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('generate-draft', {
      body: {
        emailId: 'email-1',
        userId: 'user-1',
        instruction: 'offer a 24h delay',
        isRegeneration: true,
      },
    })
    expect(mockUpdateIn).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox')
  })

  it('handles null instruction', async () => {
    mockDraftSingle.mockResolvedValue({
      data: { id: 'draft-1', email_id: 'email-1', status: 'ready', regeneration_count: 0 },
      error: null,
    })
    mockFunctionsInvoke.mockResolvedValue({ error: null })

    const { regenerateDraft } = await import('./actions')
    await regenerateDraft('draft-1', null)

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('generate-draft', {
      body: {
        emailId: 'email-1',
        userId: 'user-1',
        instruction: null,
        isRegeneration: true,
      },
    })
  })

  it('returns error when draft not found', async () => {
    mockDraftSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const { regenerateDraft } = await import('./actions')
    const result = await regenerateDraft('missing-draft', null)

    expect(result).toEqual({ success: false, error: 'Draft not found.' })
  })

  it('returns error when generation limit reached', async () => {
    mockDraftSingle.mockResolvedValue({
      data: { id: 'draft-1', email_id: 'email-1', status: 'ready', regeneration_count: 5 },
      error: null,
    })

    const { regenerateDraft } = await import('./actions')
    const result = await regenerateDraft('draft-1', null)

    expect(result).toEqual({
      success: false,
      error: 'Maximum regeneration limit reached for this draft.',
    })
  })

  it('returns error when edge function invocation fails', async () => {
    mockDraftSingle.mockResolvedValue({
      data: { id: 'draft-1', email_id: 'email-1', status: 'ready', regeneration_count: 0 },
      error: null,
    })
    mockFunctionsInvoke.mockResolvedValue({ error: { message: 'invoke failed' } })

    const { regenerateDraft } = await import('./actions')
    const result = await regenerateDraft('draft-1', 'retry')

    expect(result).toEqual({ success: false, error: 'invoke failed' })
  })
})

describe('createDraftOnDemand', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockFunctionsInvoke: ReturnType<typeof vi.fn>
  let draftQuerySequence: object[]
  let draftCallIndex: number

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    draftQuerySequence = []
    draftCallIndex = 0

    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFunctionsInvoke = vi.fn().mockResolvedValue({ error: null })

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === 'emails') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'drafts') {
          return draftQuerySequence[draftCallIndex++]
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
      functions: { invoke: mockFunctionsInvoke },
    })
  })

  it('creates a new generating draft and invokes edge function', async () => {
    draftQuerySequence.push({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })
    draftQuerySequence.push({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    const { createDraftOnDemand } = await import('./actions')
    const result = await createDraftOnDemand('email-1')

    expect(result).toEqual({ success: true })
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('generate-draft', {
      body: { emailId: 'email-1', userId: 'user-1' },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/inbox/email-1')
  })

  it('resets an existing rejected draft to generating and invokes edge function', async () => {
    draftQuerySequence.push({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'draft-1', status: 'rejected' },
              error: null,
            }),
          }),
        }),
      }),
    })
    draftQuerySequence.push({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    })

    const { createDraftOnDemand } = await import('./actions')
    const result = await createDraftOnDemand('email-1')

    expect(result).toEqual({ success: true })
    expect(mockFunctionsInvoke).toHaveBeenCalled()
  })

  it('prevents duplicate generation when draft is already generating', async () => {
    draftQuerySequence.push({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'draft-1', status: 'generating' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const { createDraftOnDemand } = await import('./actions')
    const result = await createDraftOnDemand('email-1')

    expect(result).toEqual({
      success: false,
      error: 'A draft is already being generated for this email.',
    })
    expect(mockFunctionsInvoke).not.toHaveBeenCalled()
  })

  it('prevents duplicate generation when draft is already ready', async () => {
    draftQuerySequence.push({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'draft-1', status: 'ready' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const { createDraftOnDemand } = await import('./actions')
    const result = await createDraftOnDemand('email-1')

    expect(result).toEqual({
      success: false,
      error: 'A draft is already being generated for this email.',
    })
    expect(mockFunctionsInvoke).not.toHaveBeenCalled()
  })

  it('returns error and writes draft error state when edge function invocation fails', async () => {
    const mockErrorUpdate = vi.fn().mockResolvedValue({ error: null })
    draftQuerySequence.push({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })
    draftQuerySequence.push({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    draftQuerySequence.push({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockErrorUpdate,
        }),
      }),
    })
    mockFunctionsInvoke.mockResolvedValue({ error: { message: 'function unavailable' } })

    const { createDraftOnDemand } = await import('./actions')
    const result = await createDraftOnDemand('email-1')

    expect(result).toEqual({ success: false, error: 'function unavailable' })
    expect(mockErrorUpdate).toHaveBeenCalled()
  })
})
