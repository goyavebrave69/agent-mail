import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DraftSection } from './draft-section'
import { useDraftStore } from '@/stores/draft-store'

// Mock server actions
vi.mock('@/app/(app)/inbox/[emailId]/actions', () => ({
  validateAndSendDraft: vi.fn().mockResolvedValue({ success: true }),
  rejectDraft: vi.fn().mockResolvedValue({ success: true }),
  sendManualReply: vi.fn().mockResolvedValue({ success: true }),
  createDraftOnDemand: vi.fn().mockResolvedValue({ success: true }),
  regenerateDraft: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock DraftRealtime to avoid Supabase client setup in tests
vi.mock('./draft-realtime', () => ({
  DraftRealtime: () => null,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { createDraftOnDemand } from '@/app/(app)/inbox/[emailId]/actions'

const defaultProps = {
  draft: null,
  emailId: 'email-1',
  userId: 'user-1',
}

beforeEach(() => {
  useDraftStore.getState().reset()
  vi.clearAllMocks()
})

describe('DraftSection — empty state (no draft)', () => {
  it('shows "No draft available yet." message and Create Draft button', () => {
    render(<DraftSection {...defaultProps} />)
    expect(screen.getByText(/no draft available yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create draft/i })).toBeInTheDocument()
  })

  it('Create Draft button is enabled initially', () => {
    render(<DraftSection {...defaultProps} />)
    expect(screen.getByRole('button', { name: /create draft/i })).not.toBeDisabled()
  })

  it('shows generating skeleton immediately after Create Draft is clicked', async () => {
    // Make createDraftOnDemand never resolve so we can observe the optimistic state
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))

    render(<DraftSection {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/generating draft/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /create draft/i })).not.toBeInTheDocument()
  })

  it('shows error alert when createDraftOnDemand fails', async () => {
    vi.mocked(createDraftOnDemand).mockResolvedValue({
      success: false,
      error: 'Edge function unavailable.',
    })

    render(<DraftSection {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Edge function unavailable.')).toBeInTheDocument()
    })
  })

  it('calls createDraftOnDemand with correct emailId', async () => {
    vi.mocked(createDraftOnDemand).mockResolvedValue({ success: true })

    render(<DraftSection {...defaultProps} emailId="email-42" />)
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))

    await waitFor(() => {
      expect(createDraftOnDemand).toHaveBeenCalledWith('email-42')
    })
  })
})

describe('DraftSection — compose mode (rejected + composing)', () => {
  function renderComposing() {
    useDraftStore.getState().optimisticReject()
    useDraftStore.getState().startComposing()
    return render(<DraftSection {...defaultProps} />)
  }

  it('shows ManualCompose with Create Draft button next to Send', () => {
    renderComposing()
    expect(screen.getByRole('button', { name: /create draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
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

  it('duplicate clicks are prevented: Create Draft disabled once creating starts', async () => {
    vi.mocked(createDraftOnDemand).mockImplementation(() => new Promise(() => {}))
    renderComposing()
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create draft/i })).toBeDisabled()
    })
    // Second click should not call createDraftOnDemand again
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    expect(createDraftOnDemand).toHaveBeenCalledTimes(1)
  })
})
