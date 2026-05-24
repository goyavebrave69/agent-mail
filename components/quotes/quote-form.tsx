'use client'

import { Label } from '@/components/ui/label'
import { QuoteLineItems } from './quote-line-items'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { QuoteData, QuoteLineItem, QuoteTotals } from '@/lib/quotes/types'

interface QuoteFormProps {
  quoteData: QuoteData
  totals: QuoteTotals
  emailTo: string
  emailSubject: string
  onChange: (patch: Partial<QuoteData>) => void
}

export function QuoteForm({ quoteData, totals, emailTo, emailSubject, onChange }: QuoteFormProps) {
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false)
  const { client, lineItems, quoteNumber, date, business } = quoteData

  const patchClient = (patch: Partial<QuoteData['client']>) =>
    onChange({ client: { ...client, ...patch } })

  const patchItems = (items: QuoteLineItem[]) => onChange({ lineItems: items })

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-5">
      {/* Quote meta */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">N° devis</Label>
          <p className="mt-0.5 text-sm font-medium">{quoteNumber}</p>
        </div>
        <div className="flex-1">
          <Label htmlFor="quote-date" className="text-xs text-muted-foreground">
            Date
          </Label>
          <input
            id="quote-date"
            type="date"
            value={date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="mt-0.5 block w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Client info */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </h3>
        <div className="space-y-2">
          <div>
            <Label htmlFor="client-name" className="text-xs">
              Nom / Raison sociale
            </Label>
            <input
              id="client-name"
              type="text"
              value={client.name}
              onChange={(e) => patchClient({ name: e.target.value })}
              className="mt-0.5 block w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="client-address" className="text-xs">
              Adresse
            </Label>
            <textarea
              id="client-address"
              rows={2}
              value={client.address ?? ''}
              onChange={(e) => patchClient({ address: e.target.value || null })}
              className="mt-0.5 block w-full resize-none rounded-md border bg-background px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lignes
        </h3>
        <QuoteLineItems
          items={lineItems}
          currency={business.currency}
          onChange={patchItems}
        />
      </div>

      {/* Totals */}
      <div className="rounded-md bg-muted/40 px-4 py-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Sous-total HT</span>
          <span className="tabular-nums">
            {totals.subtotalHT.toFixed(2)} {business.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>TVA ({business.taxRate}%)</span>
          <span className="tabular-nums">
            {totals.taxAmount.toFixed(2)} {business.currency}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 text-sm font-bold">
          <span>Total TTC</span>
          <span className="tabular-nums">
            {totals.totalTTC.toFixed(2)} {business.currency}
          </span>
        </div>
      </div>

      {/* Email preview (collapsible) */}
      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setEmailPreviewOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${emailPreviewOpen ? 'rotate-180' : ''}`}
          />
          Email à envoyer
        </button>
        {emailPreviewOpen && (
          <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">À : </span>
              {emailTo}
            </div>
            <div>
              <span className="font-medium">Objet : </span>
              {emailSubject}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
