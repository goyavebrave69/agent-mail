import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DraftEditor } from './draft-editor'
import { useDraftStore } from '@/stores/draft-store'

const defaultProps = {
  draftId: 'draft-1',
  initialContent: 'Hello, this is the draft content.',
  status: 'ready' as const,
  confidenceScore: 85,
  errorMessage: null,
  onValidateAndSend: vi.fn(),
  onSaveEdit: vi.fn().mockResolvedValue(undefined),
  onRegenerate: vi.fn().mockResolvedValue(undefined),
  onReject: vi.fn(),
}

beforeEach(() => {
  useDraftStore.getState().reset()
  vi.clearAllMocks()
})

describe('DraftEditor — ready state', () => {
  it('renders draft content when status is ready', () => {
    render(<DraftEditor {...defaultProps} />)
    expect(screen.getByText('Hello, this is the draft content.')).toBeInTheDocument()
  })

  it('shows confidence badge with correct color for high score', () => {
    render(<DraftEditor {...defaultProps} confidenceScore={92} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-green-100')
  })

  it('shows confidence badge for moderate score', () => {
    render(<DraftEditor {...defaultProps} confidenceScore={60} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('does not render confidence badge when score is null', () => {
    render(<DraftEditor {...defaultProps} confidenceScore={null} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows all four action buttons', () => {
    render(<DraftEditor {...defaultProps} />)
    expect(screen.getByRole('button', { name: /validate and send/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /regenerate draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject draft/i })).toBeInTheDocument()
  })
})

describe('DraftEditor — generating state', () => {
  it('shows loading skeleton when status is generating', () => {
    render(<DraftEditor {...defaultProps} status="generating" />)
    expect(screen.getByText(/generating draft/i)).toBeInTheDocument()
  })

  it('does not show draft content when generating', () => {
    render(<DraftEditor {...defaultProps} status="generating" />)
    expect(screen.queryByText('Hello, this is the draft content.')).not.toBeInTheDocument()
  })
})

describe('DraftEditor — error state', () => {
  it('shows error message with retry button when status is error', () => {
    render(
      <DraftEditor
        {...defaultProps}
        status="error"
        errorMessage="API timeout"
      />
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('API timeout')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry generation/i })).toBeInTheDocument()
  })

  it('shows fallback error message when errorMessage is null', () => {
    render(<DraftEditor {...defaultProps} status="error" errorMessage={null} />)
    expect(screen.getAllByText(/draft generation failed/i).length).toBeGreaterThan(0)
  })
})

describe('DraftEditor — editing state', () => {
  it('enters editing mode when Edit button clicked', () => {
    render(<DraftEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    expect(screen.getByRole('textbox', { name: /edit draft content/i })).toBeInTheDocument()
  })

  it('tracks edited content in textarea', () => {
    render(<DraftEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    const textarea = screen.getByRole('textbox', { name: /edit draft content/i })
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    expect(useDraftStore.getState().editedContent).toBe('Updated content')
  })

  it('shows character count in editing mode', () => {
    render(<DraftEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    expect(screen.getByText(/characters/i)).toBeInTheDocument()
  })

  it('saves edited content through the save callback', async () => {
    const onSaveEdit = vi.fn().mockResolvedValue(undefined)
    render(<DraftEditor {...defaultProps} onSaveEdit={onSaveEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    const textarea = screen.getByRole('textbox', { name: /edit draft content/i })
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save draft edits/i }))
    })

    expect(onSaveEdit).toHaveBeenCalledWith('Updated content')
  })

  it('exits editing mode on Cancel', () => {
    render(<DraftEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('textbox', { name: /edit draft content/i })).not.toBeInTheDocument()
  })

  it('sends edited content from edit mode', () => {
    const onValidateAndSend = vi.fn()
    render(<DraftEditor {...defaultProps} onValidateAndSend={onValidateAndSend} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    const textarea = screen.getByRole('textbox', { name: /edit draft content/i })
    fireEvent.change(textarea, { target: { value: 'Updated content' } })
    fireEvent.click(screen.getByRole('button', { name: /send edited draft/i }))

    expect(onValidateAndSend).toHaveBeenCalledWith('Updated content')
  })

  it('prevents editing sent drafts', () => {
    render(<DraftEditor {...defaultProps} status="sent" />)
    expect(screen.getByRole('button', { name: /edit draft/i })).toBeDisabled()
  })

  it('prevents editing rejected drafts', () => {
    render(<DraftEditor {...defaultProps} status="rejected" />)
    expect(screen.getByRole('button', { name: /edit draft/i })).toBeDisabled()
  })
})
