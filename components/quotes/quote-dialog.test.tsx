import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuoteDialog } from './quote-dialog'

// PDFViewer and QuotePdfPreview cannot run in jsdom — mock them
vi.mock('./quote-pdf-preview', () => ({
  QuotePdfPreview: () => <div data-testid="pdf-preview">PDF Preview</div>,
}))

vi.mock('next/dynamic', () => ({
  default: () => {
    const Component = (props: Record<string, unknown>) => {
      return <div data-testid="pdf-preview-dynamic" {...props} />
    }
    return Component
  },
}))

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  emailId: 'email-1',
  emailFrom: 'client@example.com',
  emailBody: 'Bonjour, pouvez-vous me faire un devis ?',
  emailSubject: 'Demande de devis',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('QuoteDialog — closed', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<QuoteDialog {...defaultProps} open={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('QuoteDialog — open, loading settings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the dialog title', () => {
    render(<QuoteDialog {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Nouveau devis')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<QuoteDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<QuoteDialog {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('QuoteDialog — settings not configured', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteNumber: 'DEV-20260409-001', nextSequence: 1 }) })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows blocked state when settings is null', async () => {
    render(<QuoteDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/configurer en 2 min/i)).toBeInTheDocument()
    })
  })
})
