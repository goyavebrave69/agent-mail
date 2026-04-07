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
}))

vi.mock('./draft-realtime', () => ({
  DraftRealtime: () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { createDraftOnDemand } from '@/app/(app)/inbox/[emailId]/actions'

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
})
