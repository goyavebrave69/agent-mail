import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PdfConfirmationBlock } from './pdf-confirmation-block'

describe('PdfConfirmationBlock', () => {
  it('renders the PDF warning message', () => {
    render(<PdfConfirmationBlock onGenerate={vi.fn()} onIgnore={vi.fn()} />)
    expect(screen.getByText(/nécessiter un devis/i)).toBeInTheDocument()
  })

  it('calls onGenerate when "Générer le devis" is clicked', () => {
    const onGenerate = vi.fn()
    render(<PdfConfirmationBlock onGenerate={onGenerate} onIgnore={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /générer le devis/i }))
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })

  it('calls onIgnore when "Ignorer" is clicked', () => {
    const onIgnore = vi.fn()
    render(<PdfConfirmationBlock onGenerate={vi.fn()} onIgnore={onIgnore} />)
    fireEvent.click(screen.getByRole('button', { name: /ignorer/i }))
    expect(onIgnore).toHaveBeenCalledTimes(1)
  })
})
