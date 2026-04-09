import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { QuoteData, QuoteLineItem } from './types'

// Register a clean sans-serif font — falls back to built-in Helvetica
// so no network dependency at runtime
const FONT_FAMILY = 'Helvetica'

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: '#1a1a1a',
    padding: 48,
    lineHeight: 1.4,
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  businessBlock: {
    maxWidth: 220,
  },
  businessName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  mutedText: {
    color: '#6b7280',
    fontSize: 9,
  },
  quoteMetaBlock: {
    alignItems: 'flex-end',
  },
  quoteTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  metaLabel: {
    color: '#6b7280',
    fontSize: 9,
    width: 70,
    textAlign: 'right',
  },
  metaValue: {
    fontSize: 9,
    width: 100,
    textAlign: 'right',
  },
  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  // ── Client block ────────────────────────────────────────────────────────────
  clientSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  // ── Line items ───────────────────────────────────────────────────────────────
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDesc: { flex: 4, fontSize: 9 },
  colQty: { flex: 1, fontSize: 9, textAlign: 'right' },
  colPrice: { flex: 1.5, fontSize: 9, textAlign: 'right' },
  colTotal: { flex: 1.5, fontSize: 9, textAlign: 'right' },
  headerText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#6b7280' },
  // ── Totals ──────────────────────────────────────────────────────────────────
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    marginBottom: 3,
  },
  totalsLabel: {
    flex: 1,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    paddingRight: 12,
  },
  totalsValue: {
    width: 72,
    fontSize: 9,
    textAlign: 'right',
  },
  totalTtcRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#111827',
    paddingTop: 4,
    marginTop: 2,
  },
  totalTtcLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    paddingRight: 12,
  },
  totalTtcValue: {
    width: 72,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

function formatAmount(amount: number, currency: string): string {
  return `${amount.toFixed(2).replace('.', ',')} ${currency}`
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function LineItemRow({ item, currency }: { item: QuoteLineItem; currency: string }) {
  const total = item.quantity * item.unitPrice
  return (
    <View style={styles.tableRow}>
      <Text style={styles.colDesc}>{item.description || '—'}</Text>
      <Text style={styles.colQty}>{item.quantity}</Text>
      <Text style={styles.colPrice}>{formatAmount(item.unitPrice, currency)}</Text>
      <Text style={styles.colTotal}>{formatAmount(total, currency)}</Text>
    </View>
  )
}

interface QuotePDFTemplateProps {
  data: QuoteData
}

export function QuotePDFTemplate({ data }: QuotePDFTemplateProps) {
  const { business, client, lineItems, quoteNumber, date } = data

  const subtotalHT = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = subtotalHT * (business.taxRate / 100)
  const totalTTC = subtotalHT + taxAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.businessBlock}>
            <Text style={styles.businessName}>{business.name || 'Mon Entreprise'}</Text>
            {business.address ? (
              <Text style={styles.mutedText}>{business.address}</Text>
            ) : null}
            {business.siret ? (
              <Text style={styles.mutedText}>SIRET : {business.siret}</Text>
            ) : null}
            {business.vatNumber ? (
              <Text style={styles.mutedText}>TVA : {business.vatNumber}</Text>
            ) : null}
          </View>
          <View style={styles.quoteMetaBlock}>
            <Text style={styles.quoteTitle}>DEVIS</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>N°</Text>
              <Text style={styles.metaValue}>{quoteNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formatDate(date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client */}
        <View style={styles.clientSection}>
          <Text style={styles.sectionLabel}>Client</Text>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.address ? (
            <Text style={styles.mutedText}>{client.address}</Text>
          ) : null}
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
            <Text style={[styles.colQty, styles.headerText]}>Qté</Text>
            <Text style={[styles.colPrice, styles.headerText]}>Prix unitaire</Text>
            <Text style={[styles.colTotal, styles.headerText]}>Total HT</Text>
          </View>
          {lineItems.map((item) => (
            <LineItemRow key={item.id} item={item} currency={business.currency} />
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>{formatAmount(subtotalHT, business.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA ({business.taxRate}%)</Text>
            <Text style={styles.totalsValue}>{formatAmount(taxAmount, business.currency)}</Text>
          </View>
          <View style={styles.totalTtcRow}>
            <Text style={styles.totalTtcLabel}>Total TTC</Text>
            <Text style={styles.totalTtcValue}>{formatAmount(totalTTC, business.currency)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Conditions de règlement : {business.paymentTerms}</Text>
        </View>
      </Page>
    </Document>
  )
}
