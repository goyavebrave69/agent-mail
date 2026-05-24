'use client'

import { PDFViewer } from '@react-pdf/renderer'
import { QuotePDFTemplate } from '@/lib/quotes/pdf-template'
import type { QuoteData } from '@/lib/quotes/types'

interface PdfViewerInnerProps {
  quoteData: QuoteData
}

export function PdfViewerInner({ quoteData }: PdfViewerInnerProps) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false}>
      <QuotePDFTemplate data={quoteData} />
    </PDFViewer>
  )
}
