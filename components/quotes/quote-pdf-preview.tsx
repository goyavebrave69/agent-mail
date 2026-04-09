'use client'

import dynamic from 'next/dynamic'
import type { QuoteData } from '@/lib/quotes/types'

// PDFViewer must be dynamically imported (no SSR) — it renders an iframe
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <PreviewSkeleton /> }
)

const QuotePDFTemplate = dynamic(
  () => import('@/lib/quotes/pdf-template').then((mod) => mod.QuotePDFTemplate),
  { ssr: false }
)

function PreviewSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-muted/20">
      <div className="text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Génération de la prévisualisation…
      </div>
    </div>
  )
}

interface QuotePdfPreviewProps {
  quoteData: QuoteData
}

export function QuotePdfPreview({ quoteData }: QuotePdfPreviewProps) {
  return (
    <div className="h-full">
      <PDFViewer width="100%" height="100%" showToolbar={false}>
        <QuotePDFTemplate data={quoteData} />
      </PDFViewer>
    </div>
  )
}
