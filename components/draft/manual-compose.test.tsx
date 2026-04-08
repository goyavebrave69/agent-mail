import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ManualCompose } from './manual-compose'

const defaultProps = {
  emailId: 'email-1',
  mode: 'reply' as const,
  composeTo: 'sender@example.com',
  composeSubject: 'Re: Test subject',
  composeQuotedBody: '',
  onToChange: vi.fn(),
  onSubjectChange: vi.fn(),
  onSend: vi.fn(),
  onCancel: vi.fn(),
  isSending: false,
  sendError: null,
  manualContent: '',
  onContentChange: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ManualCompose', () => {
  it('renders textarea and Cancel/Send buttons', () => {
    render(<ManualCompose {...defaultProps} />)
    expect(screen.getByRole('textbox', { name: /message body/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
  })

  it('Send button is disabled when content is empty', () => {
    render(<ManualCompose {...defaultProps} manualContent="" />)
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled()
  })

  it('Send button is disabled when content is only whitespace', () => {
    render(<ManualCompose {...defaultProps} manualContent="   " />)
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled()
  })

  it('Send button is enabled when content has text', () => {
    render(<ManualCompose {...defaultProps} manualContent="Hello there" />)
    expect(screen.getByRole('button', { name: /send reply/i })).not.toBeDisabled()
  })

  it('calls onContentChange when textarea value changes', () => {
    const onContentChange = vi.fn()
    render(<ManualCompose {...defaultProps} onContentChange={onContentChange} manualContent="" />)
    fireEvent.change(screen.getByRole('textbox', { name: /message body/i }), {
      target: { value: 'New text' },
    })
    expect(onContentChange).toHaveBeenCalledWith('New text')
  })

  it('calls onSend with content when Send is clicked', () => {
    const onSend = vi.fn()
    render(<ManualCompose {...defaultProps} onSend={onSend} manualContent="My reply" />)
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }))
    expect(onSend).toHaveBeenCalledWith('My reply')
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<ManualCompose {...defaultProps} onCancel={onCancel} manualContent="Some text" />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables textarea while sending', () => {
    render(<ManualCompose {...defaultProps} isSending manualContent="Hello" />)
    expect(screen.getByRole('textbox', { name: /message body/i })).toBeDisabled()
  })

  it('shows Sending… label on Send button while sending', () => {
    render(<ManualCompose {...defaultProps} isSending manualContent="Hello" />)
    expect(screen.getByRole('button', { name: /send reply/i })).toHaveTextContent('Sending…')
  })

  it('shows error alert when sendError is provided', () => {
    render(<ManualCompose {...defaultProps} sendError="Failed to send." />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to send.')).toBeInTheDocument()
  })

  it('does not show error alert when sendError is null', () => {
    render(<ManualCompose {...defaultProps} sendError={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows quoted body when composeQuotedBody is provided', () => {
    render(<ManualCompose {...defaultProps} composeQuotedBody="Original message text" />)
    expect(screen.getByText('Original message text')).toBeInTheDocument()
  })

  it('does not show quoted body block when composeQuotedBody is empty', () => {
    render(<ManualCompose {...defaultProps} composeQuotedBody="" />)
    expect(screen.queryByText(/original message/i)).not.toBeInTheDocument()
  })

  it('shows Forward button label in forward mode', () => {
    render(<ManualCompose {...defaultProps} mode="forward" manualContent="Fwd text" />)
    expect(screen.getByRole('button', { name: /forward/i })).toBeInTheDocument()
  })
})

describe('ManualCompose — Create Draft button', () => {
  it('does not render draft button when onCreateDraft is not provided', () => {
    render(<ManualCompose {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /réponse|generate draft/i })).not.toBeInTheDocument()
  })

  it('renders draft button when onCreateDraft is provided', () => {
    render(<ManualCompose {...defaultProps} onCreateDraft={vi.fn()} />)
    expect(screen.getByRole('button', { name: /réponse/i })).toBeInTheDocument()
  })

  it('draft button is enabled initially', () => {
    render(<ManualCompose {...defaultProps} onCreateDraft={vi.fn()} />)
    expect(screen.getByRole('button', { name: /réponse/i })).not.toBeDisabled()
  })

  it('calls onCreateDraft when draft button is clicked', () => {
    const onCreateDraft = vi.fn()
    render(<ManualCompose {...defaultProps} onCreateDraft={onCreateDraft} />)
    fireEvent.click(screen.getByRole('button', { name: /réponse/i }))
    expect(onCreateDraft).toHaveBeenCalledOnce()
  })

  it('draft button shows Generating… and is disabled when isCreating is true', () => {
    render(<ManualCompose {...defaultProps} onCreateDraft={vi.fn()} isCreating />)
    const btn = screen.getByRole('button', { name: /generating/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent('Generating…')
  })

  it('draft button is disabled while isSending is true', () => {
    render(<ManualCompose {...defaultProps} onCreateDraft={vi.fn()} isSending manualContent="Hello" />)
    expect(screen.getByRole('button', { name: /generating|réponse/i })).toBeDisabled()
  })

  it('Cancel button is disabled when isCreating is true', () => {
    render(<ManualCompose {...defaultProps} onCreateDraft={vi.fn()} isCreating />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('does not render draft button in forward mode', () => {
    render(<ManualCompose {...defaultProps} mode="forward" onCreateDraft={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /réponse/i })).not.toBeInTheDocument()
  })
})
