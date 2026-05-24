'use client'

import dynamic from 'next/dynamic'
import type { QuoteData } from '@/lib/quotes/types'

// Both PDFViewer and the template must live in the same dynamic chunk
// so they share the same @react-pdf/renderer module instance.
const PdfViewerInner = dynamic(
  () => import('./pdf-viewer-inner').then((mod) => mod.PdfViewerInner),
  { ssr: false, loading: () => <PreviewSkeleton /> }
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
      <PdfViewerInner quoteData={quoteData} />
    </div>
  )
}
