/**
 * Generate a quote number in the format DEV-YYYYMMDD-XXX
 * where XXX is the next sequential suffix (zero-padded to 3 digits).
 */
export function generateQuoteNumber(lastSequence: number, date: Date = new Date()): {
  quoteNumber: string
  nextSequence: number
} {
  const nextSequence = lastSequence + 1
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const suffix = String(nextSequence).padStart(3, '0')
  return {
    quoteNumber: `DEV-${yyyy}${mm}${dd}-${suffix}`,
    nextSequence,
  }
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
