'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { InvoiceSettings } from '@/lib/quotes/types'

interface InvoiceSettingsSectionProps {
  initialSettings: InvoiceSettings | null
}

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'CAD']
const MODE_OPTIONS = [
  { value: 'auto', label: 'Automatique' },
  { value: 'template', label: 'Depuis mon modèle' },
] as const

export function InvoiceSettingsSection({ initialSettings }: InvoiceSettingsSectionProps) {
  const s = initialSettings
  const [mode, setMode] = useState<'auto' | 'template'>(s?.mode ?? 'auto')
  const [businessName, setBusinessName] = useState(s?.business_name ?? '')
  const [address, setAddress] = useState(s?.address ?? '')
  const [siret, setSiret] = useState(s?.siret ?? '')
  const [vatNumber, setVatNumber] = useState(s?.vat_number ?? '')
  const [paymentTerms, setPaymentTerms] = useState(s?.payment_terms ?? '30 jours net')
  const [currency, setCurrency] = useState(s?.currency ?? 'EUR')
  const [taxRate, setTaxRate] = useState(String(s?.tax_rate ?? '20'))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/invoice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          business_name: businessName || null,
          address: address || null,
          siret: siret || null,
          vat_number: vatNumber || null,
          payment_terms: paymentTerms || '30 jours net',
          currency,
          tax_rate: parseFloat(taxRate) || 20,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.')
      setStatus('error')
    }
  }

  return (
    <section id="invoice" className="mb-8 rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold">Devis &amp; Facturation</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Ces informations seront utilisées pour générer des devis PDF professionnels directement
        depuis votre boîte mail.
      </p>

      {/* Mini-preview */}
      <div className="mb-5 rounded-md border bg-muted/30 px-4 py-3 text-sm">
        <p className="font-semibold">{businessName || 'Mon Entreprise'}</p>
        {address && <p className="text-xs text-muted-foreground">{address}</p>}
        {siret && <p className="text-xs text-muted-foreground">SIRET : {siret}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode toggle */}
        <div>
          <Label className="mb-1.5 block text-xs">Mode</Label>
          <div className="flex gap-2">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  mode === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-business-name" className="text-xs">Raison sociale</Label>
            <input
              id="inv-business-name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="inv-siret" className="text-xs">SIRET</Label>
            <input
              id="inv-siret"
              type="text"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="inv-address" className="text-xs">Adresse</Label>
          <textarea
            id="inv-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-0.5 block w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-vat" className="text-xs">N° TVA intracommunautaire</Label>
            <input
              id="inv-vat"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="inv-payment-terms" className="text-xs">Conditions de règlement</Label>
            <input
              id="inv-payment-terms"
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-currency" className="text-xs">Devise</Label>
            <select
              id="inv-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="inv-tax-rate" className="text-xs">Taux TVA (%)</Label>
            <input
              id="inv-tax-rate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="mt-0.5 block w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {mode === 'template' && (
          <div>
            <Label className="text-xs">Modèle de référence (PDF ou image, max 5 Mo)</Label>
            <div className="mt-1 flex items-center justify-center rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Glissez-déposez un fichier ou cliquez pour sélectionner
            </div>
          </div>
        )}

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
          {status === 'saved' && (
            <span className="text-sm text-muted-foreground">Sauvegardé</span>
          )}
        </div>
      </form>
    </section>
  )
}
