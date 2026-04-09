'use client'

import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuoteLineItem } from '@/lib/quotes/types'

interface QuoteLineItemsProps {
  items: QuoteLineItem[]
  currency: string
  onChange: (items: QuoteLineItem[]) => void
}

function newItem(): QuoteLineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }
}

export function QuoteLineItems({ items, currency, onChange }: QuoteLineItemsProps) {
  const update = (id: string, patch: Partial<QuoteLineItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const remove = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const add = () => {
    onChange([...items, newItem()])
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_60px_80px_80px_28px] gap-1 px-1 text-xs font-medium text-muted-foreground">
        <span>Description</span>
        <span className="text-right">Qté</span>
        <span className="text-right">Prix unit.</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <div className="divide-y rounded-md border">
        {items.map((item) => {
          const total = item.quantity * item.unitPrice
          return (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_60px_80px_80px_28px] items-center gap-1 px-2 py-1.5"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) => update(item.id, { description: e.target.value })}
                placeholder="Description"
                className="w-full rounded border-0 bg-transparent text-sm outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                aria-label="Description"
              />
              <input
                type="number"
                value={item.quantity}
                min={0}
                step={1}
                onChange={(e) => update(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border-0 bg-transparent text-right text-sm outline-none focus:ring-0"
                aria-label="Quantité"
              />
              <input
                type="number"
                value={item.unitPrice}
                min={0}
                step={0.01}
                onChange={(e) => update(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border-0 bg-transparent text-right text-sm outline-none focus:ring-0"
                aria-label="Prix unitaire"
              />
              <span className="text-right text-sm tabular-nums text-muted-foreground">
                {total.toFixed(2)} {currency}
              </span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Supprimer la ligne"
                className="flex items-center justify-center text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            Aucune ligne — cliquez sur « + Ajouter »
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="mt-2 h-7 gap-1 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une ligne
      </Button>
    </div>
  )
}
