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

vi.mock('./draft-realtime', () => ({
  DraftRealtime: () => null,
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
  const defaultPrefill = { to: 'sender@example.com', subject: 'Re: Test', quotedBody: '' }

  function renderComposing() {
    useDraftStore.getState().startComposing('reply', defaultPrefill)
    return render(<DraftSection {...defaultProps} />)
  }

  it('shows ManualCompose with Send and Réponse buttons when composing', () => {
    renderComposing()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réponse/i })).toBeInTheDocument()
  })

  it('shows textarea for manual reply', () => {
    renderComposing()
    expect(screen.getByRole('textbox', { name: /message body/i })).toBeInTheDocument()
  })

  it('clicking Réponse calls createDraftOnDemand with emailId', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    await waitFor(() => {
      expect(createDraftOnDemand).toHaveBeenCalledWith('email-1')
    })
  })

  it('Réponse button shows Generating… and is disabled while creating', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /generating/i })
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent('Generating…')
    })
  })

  it('duplicate clicks are prevented once creating starts', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /generating/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    await waitFor(() => {
      const textarea = screen.getByRole('textbox', { name: /message body/i }) as HTMLTextAreaElement
      expect(textarea.value).toBe('AI generated reply content.')
    })
  })

  it('shows error alert when createDraftOnDemand fails', async () => {
    vi.mocked(createDraftOnDemand).mockResolvedValue({
      success: false,
      error: 'Edge function unavailable.',
    })
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Edge function unavailable.')).toBeInTheDocument()
    })
  })
})
