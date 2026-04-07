import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DraftSection } from './draft-section'
import { useDraftStore } from '@/stores/draft-store'

vi.mock('@/app/(app)/inbox/[emailId]/actions', () => ({
  validateAndSendDraft: vi.fn().mockResolvedValue({ success: true }),
  rejectDraft: vi.fn().mockResolvedValue({ success: true }),
  sendManualReply: vi.fn().mockResolvedValue({ success: true }),
  createDraftOnDemand: vi.fn().mockResolvedValue({ success: true }),
  regenerateDraft: vi.fn().mockResolvedValue({ success: true }),
  fetchDraftForEmail: vi.fn().mockResolvedValue({
    id: 'draft-1',
    status: 'ready',
    content: 'AI generated reply content.',
    confidence_score: 80,
  }),
}))

const realtimeCallbacks: {
  onDraftUpdate?: (draft: {
    email_id: string
    status: 'ready' | 'error' | 'generating' | 'pending' | 'sent' | 'rejected'
    content?: string | null
    [key: string]: unknown
  }) => void
} = {}

vi.mock('./draft-realtime', () => ({
  DraftRealtime: ({ onDraftUpdate }: { onDraftUpdate: (draft: {
    email_id: string
    status: 'ready' | 'error' | 'generating' | 'pending' | 'sent' | 'rejected'
    content?: string | null
    [key: string]: unknown
  }) => void }) => {
    realtimeCallbacks.onDraftUpdate = onDraftUpdate
    return null
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { createDraftOnDemand, fetchDraftForEmail } from '@/app/(app)/inbox/[emailId]/actions'

const defaultProps = {
  emailId: 'email-1',
  userId: 'user-1',
}

beforeEach(() => {
  useDraftStore.getState().reset()
  vi.clearAllMocks()
})

describe('DraftSection — not composing', () => {
  it('renders nothing when not composing', () => {
    const { container } = render(<DraftSection {...defaultProps} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DraftSection — compose mode', () => {
  function renderComposing() {
    useDraftStore.getState().startComposing()
    return render(<DraftSection {...defaultProps} />)
  }

  it('shows ManualCompose with Send and Create Draft buttons when composing', () => {
    renderComposing()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create draft/i })).toBeInTheDocument()
  })

  it('shows textarea for manual reply', () => {
    renderComposing()
    expect(screen.getByRole('textbox', { name: /write your reply/i })).toBeInTheDocument()
  })

  it('clicking Create Draft calls createDraftOnDemand with emailId', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      expect(createDraftOnDemand).toHaveBeenCalledWith('email-1')
    })
  })

  it('Create Draft button shows Generating… and is disabled while creating', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /create draft/i })
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('Generating…')
    })
  })

  it('duplicate clicks are prevented once creating starts', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create draft/i })).toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    expect(createDraftOnDemand).toHaveBeenCalledTimes(1)
  })

  it('populates textarea with draft content after successful generation', async () => {
    vi.mocked(createDraftOnDemand).mockResolvedValue({ success: true })
    vi.mocked(fetchDraftForEmail).mockResolvedValue({
      id: 'draft-1',
      status: 'ready',
      content: 'AI generated reply content.',
      confidence_score: 80,
      email_id: 'email-1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
      sent_at: null,
      regeneration_count: 0,
      generation_instruction: null,
      retry_count: 0,
    })
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      const textarea = screen.getByRole('textbox', { name: /write your reply/i }) as HTMLTextAreaElement
      expect(textarea.value).toBe('AI generated reply content.')
    })
  })

  it('shows error alert when createDraftOnDemand fails', async () => {
    vi.mocked(createDraftOnDemand).mockResolvedValue({
      success: false,
      error: 'Edge function unavailable.',
    })
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Edge function unavailable.')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createDraftOnDemand throws', async () => {
    vi.mocked(createDraftOnDemand).mockRejectedValue(new Error('network error'))
    renderComposing()

    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to start draft generation.')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /create draft/i })).toBeEnabled()
  })

  it('ignores realtime draft updates for another email while composing', async () => {
    renderComposing()

    fireEvent.change(screen.getByRole('textbox', { name: /write your reply/i }), {
      target: { value: 'my manual draft' },
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /write your reply/i })).toHaveValue('my manual draft')
    })

    realtimeCallbacks.onDraftUpdate?.({
      id: 'draft-other',
      email_id: 'email-2',
      user_id: 'user-1',
      status: 'ready',
      content: 'other email draft content',
      confidence_score: 88,
      error_message: null,
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /write your reply/i })).toHaveValue('my manual draft')
    })
  })
})
