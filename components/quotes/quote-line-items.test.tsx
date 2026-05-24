import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QuoteLineItems } from './quote-line-items'
import type { QuoteLineItem } from '@/lib/quotes/types'

const ITEM: QuoteLineItem = {
  id: 'item-1',
  description: 'Prestation conseil',
  quantity: 2,
  unitPrice: 500,
}

describe('QuoteLineItems', () => {
  it('renders existing line items', () => {
    render(<QuoteLineItems items={[ITEM]} currency="EUR" onChange={vi.fn()} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onChange with new item on "+ Ajouter une ligne"', () => {
    const onChange = vi.fn()
    render(<QuoteLineItems items={[ITEM]} currency="EUR" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter une ligne/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const updated = onChange.mock.calls[0][0] as QuoteLineItem[]
    expect(updated).toHaveLength(2)
  })

  it('calls onChange without item on trash click', () => {
    const onChange = vi.fn()
    render(<QuoteLineItems items={[ITEM]} currency="EUR" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('computes and displays total (qty × unit price)', () => {
    render(<QuoteLineItems items={[ITEM]} currency="EUR" onChange={vi.fn()} />)
    // 2 × 500 = 1000.00 EUR
    expect(screen.getByText(/1000\.00 EUR/)).toBeInTheDocument()
  })

  it('shows empty state message when no items', () => {
    render(<QuoteLineItems items={[]} currency="EUR" onChange={vi.fn()} />)
    expect(screen.getByText(/aucune ligne/i)).toBeInTheDocument()
  })
})
