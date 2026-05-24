import { describe, it, expect } from 'vitest'
import { extractClientInfo } from './extract-client-info'

describe('extractClientInfo', () => {
  it('extracts display name from "Name <email>" format', () => {
    const result = extractClientInfo({ from: 'Jean Dupont <jean@example.com>', body: '' })
    expect(result.name).toBe('Jean Dupont')
  })

  it('extracts local part when no display name', () => {
    const result = extractClientInfo({ from: 'contact@example.com', body: '' })
    expect(result.name).toBe('contact')
  })

  it('returns null address when body has no address', () => {
    const result = extractClientInfo({ from: 'a@b.com', body: 'Bonjour, j\'ai une question.' })
    expect(result.address).toBeNull()
  })

  it('detects a street address in the email body', () => {
    const body = 'Notre siège est au 12 Rue de la Paix\n75001 Paris France'
    const result = extractClientInfo({ from: 'a@b.com', body })
    expect(result.address).not.toBeNull()
    expect(result.address).toContain('Rue de la Paix')
  })
})
