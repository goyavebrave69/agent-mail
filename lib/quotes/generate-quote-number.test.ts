import { describe, it, expect } from 'vitest'
import { generateQuoteNumber } from './generate-quote-number'

describe('generateQuoteNumber', () => {
  it('returns correct DEV-YYYYMMDD-XXX format', () => {
    const date = new Date('2026-04-09')
    const { quoteNumber } = generateQuoteNumber(0, date)
    expect(quoteNumber).toBe('DEV-20260409-001')
  })

  it('pads the suffix to 3 digits', () => {
    const date = new Date('2026-04-09')
    const { quoteNumber } = generateQuoteNumber(4, date)
    expect(quoteNumber).toBe('DEV-20260409-005')
  })

  it('increments the sequence correctly', () => {
    const { nextSequence } = generateQuoteNumber(7)
    expect(nextSequence).toBe(8)
  })

  it('handles large sequence numbers', () => {
    const date = new Date('2026-04-09')
    const { quoteNumber } = generateQuoteNumber(999, date)
    expect(quoteNumber).toBe('DEV-20260409-1000')
  })
})
