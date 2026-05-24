'use client'

import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfConfirmationBlockProps {
  onGenerate: () => void
  onIgnore: () => void
}

export function PdfConfirmationBlock({ onGenerate, onIgnore }: PdfConfirmationBlockProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            Cet email semble nécessiter un devis
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            L&apos;expéditeur paraît demander une offre commerciale ou un document chiffré.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={onGenerate}>
              Générer le devis
            </Button>
            <button
              type="button"
              onClick={onIgnore}
              className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
