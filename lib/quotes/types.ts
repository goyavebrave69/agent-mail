export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export interface QuoteData {
  quoteNumber: string
  date: string // ISO date string YYYY-MM-DD
  business: {
    name: string
    address: string
    siret: string | null
    vatNumber: string | null
    logoUrl: string | null
    paymentTerms: string
    currency: string
    taxRate: number
  }
  client: {
    name: string
    address: string | null
  }
  lineItems: QuoteLineItem[]
}

export interface QuoteTotals {
  subtotalHT: number
  taxAmount: number
  totalTTC: number
}

export interface InvoiceSettings {
  mode: 'auto' | 'template'
  business_name: string | null
  address: string | null
  siret: string | null
  vat_number: string | null
  logo_url: string | null
  payment_terms: string | null
  currency: string
  tax_rate: number
  template_file_url: string | null
  last_quote_sequence: number
}
