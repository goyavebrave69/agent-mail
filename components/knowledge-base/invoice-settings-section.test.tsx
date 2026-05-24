import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InvoiceSettingsSection } from './invoice-settings-section'

describe('InvoiceSettingsSection', () => {
  it('renders with null initial settings', () => {
    render(<InvoiceSettingsSection initialSettings={null} />)
    expect(screen.getByText(/informations commerciales/i)).toBeInTheDocument()
  })

  it('does NOT show template upload zone when mode is Automatique', () => {
    render(<InvoiceSettingsSection initialSettings={null} />)
    expect(screen.queryByText(/modèle de référence/i)).not.toBeInTheDocument()
  })

  it('shows template upload zone when mode is Depuis mon modèle', () => {
    render(<InvoiceSettingsSection initialSettings={null} />)
    fireEvent.click(screen.getByRole('button', { name: /depuis mon modèle/i }))
    expect(screen.getByText(/modèle de référence/i)).toBeInTheDocument()
  })

  it('updates mini-preview when business name changes', () => {
    render(<InvoiceSettingsSection initialSettings={null} />)
    const input = screen.getByLabelText(/raison sociale/i)
    fireEvent.change(input, { target: { value: 'Dupont SARL' } })
    expect(screen.getByText('Dupont SARL')).toBeInTheDocument()
  })

  it('Save button triggers fetch POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<InvoiceSettingsSection initialSettings={null} />)
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/invoice-settings',
      expect.objectContaining({ method: 'POST' })
    )
    vi.unstubAllGlobals()
  })
})
