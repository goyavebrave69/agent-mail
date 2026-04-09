'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, FileText, CheckCircle, Download } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { QuoteForm } from './quote-form'
import { sendQuoteAction } from '@/app/(app)/inbox/[emailId]/send-quote-action'
import { extractClientInfo } from '@/lib/quotes/extract-client-info'
import { todayIso } from '@/lib/quotes/generate-quote-number'
import type { QuoteData, QuoteTotals, InvoiceSettings } from '@/lib/quotes/types'

// PDFViewer requires browser — lazy load
const QuotePdfPreview = dynamic(
  () => import('./quote-pdf-preview').then((m) => m.QuotePdfPreview),
  { ssr: false }
)

interface QuoteDialogProps {
  open: boolean
  onClose: () => void
  emailId: string
  emailFrom: string
  emailBody: string
  emailSubject: string
}

function computeTotals(quoteData: QuoteData): QuoteTotals {
  const subtotalHT = quoteData.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const taxAmount = subtotalHT * (quoteData.business.taxRate / 100)
  return { subtotalHT, taxAmount, totalTTC: subtotalHT + taxAmount }
}

function BlockedState({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold">Génération de devis non configurée</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez vos informations commerciales pour pouvoir générer des devis.
        </p>
      </div>
      <Button onClick={onConfigure}>Configurer en 2 min</Button>
    </div>
  )
}

function SuccessOverlay({ clientName }: { clientName: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/95">
      <CheckCircle className="h-12 w-12 text-green-500" />
      <p className="text-base font-semibold">Devis envoyé à {clientName}</p>
    </div>
  )
}

export function QuoteDialog({
  open,
  onClose,
  emailId,
  emailFrom,
  emailBody,
  emailSubject,
}: QuoteDialogProps) {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [quoteSubject] = useState(`Devis — ${emailSubject}`)

  // Load settings and init quote when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingSettings(true)
    setSendError(null)
    setShowSuccess(false)

    void (async () => {
      try {
        const [settingsRes, seqRes, extractedRes] = await Promise.all([
          fetch('/api/invoice-settings'),
          fetch('/api/invoice-settings', { method: 'PATCH' }),
          fetch('/api/extract-quote-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailSubject, emailBody }),
          }),
        ])
        const { settings: s } = await settingsRes.json() as { settings: InvoiceSettings | null }
        setSettings(s)

        if (s) {
          const { quoteNumber } = await seqRes.json() as { quoteNumber: string }
          const extracted = await extractedRes.json() as {
            lineItems: import('@/lib/quotes/types').QuoteLineItem[]
            clientName?: string | null
          }
          const clientInfo = extractClientInfo({ from: emailFrom, body: emailBody })
          const client = extracted.clientName && !clientInfo.name
            ? { ...clientInfo, name: extracted.clientName }
            : clientInfo
          setQuoteData({
            quoteNumber,
            date: todayIso(),
            business: {
              name: s.business_name ?? '',
              address: s.address ?? '',
              siret: s.siret,
              vatNumber: s.vat_number,
              logoUrl: s.logo_url,
              paymentTerms: s.payment_terms ?? '30 jours net',
              currency: s.currency,
              taxRate: s.tax_rate,
            },
            client,
            lineItems: extracted.lineItems,
          })
        }
      } finally {
        setLoadingSettings(false)
      }
    })()
  }, [open, emailFrom, emailBody])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSend = useCallback(async () => {
    if (!quoteData) return
    setSending(true)
    setSendError(null)

    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { QuotePDFTemplate } = await import('@/lib/quotes/pdf-template')

      const blob = await pdf(<QuotePDFTemplate data={quoteData} />).toBlob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      let binary = ''
      for (const byte of uint8) binary += String.fromCharCode(byte)
      const contentBase64 = btoa(binary)

      const result = await sendQuoteAction(
        emailId,
        {
          filename: `devis-${quoteData.quoteNumber}.pdf`,
          contentBase64,
          contentType: 'application/pdf',
        },
        quoteSubject
      )

      if (result.success) {
        setShowSuccess(true)
        setTimeout(onClose, 2500)
      } else {
        setSendError(result.error ?? 'Erreur lors de l\'envoi.')
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erreur inattendue.')
    } finally {
      setSending(false)
    }
  }, [quoteData, emailId, quoteSubject, onClose])

  const handleDownload = useCallback(async () => {
    if (!quoteData) return
    const { pdf } = await import('@react-pdf/renderer')
    const { QuotePDFTemplate } = await import('@/lib/quotes/pdf-template')

    const blob = await pdf(<QuotePDFTemplate data={quoteData} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devis-${quoteData.quoteNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [quoteData])

  if (!open) return null

  const totals = quoteData ? computeTotals(quoteData) : null

  return (
    <>
      {/* Blurred backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau devis"
        className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
          <h2 className="text-base font-semibold">Nouveau devis</h2>
          <div className="flex items-center gap-2">
            {settings && quoteData && (
              <>
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={sending}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Télécharger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={sending}
                >
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSend} disabled={sending}>
                  {sending ? 'Envoi…' : 'Envoyer en PJ'}
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sendError && (
          <div className="shrink-0 bg-destructive/10 px-6 py-2 text-sm text-destructive">
            {sendError}
          </div>
        )}

        {/* Body */}
        <div className="relative flex flex-1 min-h-0">
          {showSuccess && quoteData && (
            <SuccessOverlay clientName={quoteData.client.name} />
          )}

          {loadingSettings && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Chargement…
            </div>
          )}

          {!loadingSettings && !settings && (
            <div className="flex-1 px-6">
              <BlockedState
                onConfigure={() => {
                  onClose()
                  window.location.href = '/knowledge-base#invoice'
                }}
              />
            </div>
          )}

          {!loadingSettings && settings && quoteData && totals && (
            <>
              {/* Left panel — form */}
              <div className="w-[400px] shrink-0 overflow-y-auto border-r">
                <QuoteForm
                  quoteData={quoteData}
                  totals={totals}
                  emailTo={emailFrom}
                  emailSubject={quoteSubject}
                  onChange={(patch) => setQuoteData((prev) => prev ? { ...prev, ...patch } : prev)}
                />
              </div>

              {/* Right panel — PDF preview */}
              <div className="flex-1 bg-muted/10">
                <QuotePdfPreview quoteData={quoteData} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
