import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DraftActions } from './draft-actions'

const defaultProps = {
  draftId: 'draft-1',
  status: 'ready' as const,
  draftContent: 'Original content',
  onValidateAndSend: vi.fn(),
  onEdit: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onRegenerate: vi.fn(),
  onOpenRegenerateModal: vi.fn(),
  onCloseRegenerateModal: vi.fn(),
  onReject: vi.fn(),
}

describe('DraftActions', () => {
  it('renders all four action buttons', () => {
    render(<DraftActions {...defaultProps} />)
    expect(screen.getByRole('button', { name: /validate and send/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /regenerate draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject draft/i })).toBeInTheDocument()
  })

  it('all buttons are disabled when status is generating', () => {
    render(<DraftActions {...defaultProps} status="generating" />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('all buttons are enabled when status is ready', () => {
    render(<DraftActions {...defaultProps} status="ready" />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it('calls onValidateAndSend when Validate & Send is clicked', () => {
    const onValidateAndSend = vi.fn()
    render(<DraftActions {...defaultProps} onValidateAndSend={onValidateAndSend} />)
    fireEvent.click(screen.getByRole('button', { name: /validate and send/i }))
    expect(onValidateAndSend).toHaveBeenCalledWith()
  })

  it('calls onEdit when Edit is clicked', () => {
    const onEdit = vi.fn()
    render(<DraftActions {...defaultProps} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /edit draft/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('calls onRegenerate when Regenerate is clicked', () => {
    const onOpenRegenerateModal = vi.fn()
    render(<DraftActions {...defaultProps} onOpenRegenerateModal={onOpenRegenerateModal} />)
    fireEvent.click(screen.getByRole('button', { name: /regenerate draft/i }))
    expect(onOpenRegenerateModal).toHaveBeenCalledOnce()
  })

  it('calls onReject when Reject is clicked', () => {
    const onReject = vi.fn()
    render(<DraftActions {...defaultProps} onReject={onReject} />)
    fireEvent.click(screen.getByRole('button', { name: /reject draft/i }))
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('renders edit-mode controls when editing', () => {
    render(
      <DraftActions
        {...defaultProps}
        isEditing
        editedContent="Changed content"
        hasUnsavedChanges
      />
    )

    expect(screen.getByRole('button', { name: /cancel editing draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save draft edits/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send edited draft/i })).toBeInTheDocument()
  })

  it('renders regeneration modal and confirms without instruction', () => {
    const onRegenerate = vi.fn()
    render(
      <DraftActions
        {...defaultProps}
        showRegenerateModal
        onRegenerate={onRegenerate}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /regenerate without instructions/i }))
    expect(onRegenerate).toHaveBeenCalledWith(null)
  })
})
