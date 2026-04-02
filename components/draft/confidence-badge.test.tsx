import '@testing-library/jest-dom/vitest'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConfidenceBadge } from './confidence-badge'

describe('ConfidenceBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with correct aria-label for high score', () => {
    render(<ConfidenceBadge score={95} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label', 'Confidence score: 95%. High confidence')
  })

  it('renders with correct aria-label for good score', () => {
    render(<ConfidenceBadge score={75} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Confidence score: 75%. Good confidence'
    )
  })

  it('renders with correct aria-label for moderate score', () => {
    render(<ConfidenceBadge score={55} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Confidence score: 55%. Moderate confidence'
    )
  })

  it('renders with correct aria-label for low score', () => {
    render(<ConfidenceBadge score={30} />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Confidence score: 30%. Low confidence — review recommended'
    )
  })

  it('applies green color class for high confidence (>=90)', () => {
    render(<ConfidenceBadge score={92} showLabel={false} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })

  it('applies blue color class for good confidence (70-89)', () => {
    render(<ConfidenceBadge score={80} showLabel={false} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('applies amber color class for moderate confidence (50-69)', () => {
    render(<ConfidenceBadge score={60} showLabel={false} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('applies rose color class and pulse for low confidence (<50)', () => {
    render(<ConfidenceBadge score={30} showLabel={false} />)
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-rose-100')
    expect(badge.className).toContain('animate-pulse')
  })

  it('shows label when showLabel is true', () => {
    render(<ConfidenceBadge score={95} showLabel />)
    expect(screen.getByTestId('confidence-label')).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<ConfidenceBadge score={95} showLabel={false} />)
    expect(screen.queryByTestId('confidence-label')).not.toBeInTheDocument()
  })

  it('counts up to final score after animation', () => {
    render(<ConfidenceBadge score={90} />)
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByTestId('confidence-score').textContent).toBe('90%')
  })
})
