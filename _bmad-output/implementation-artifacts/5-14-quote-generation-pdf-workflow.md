# Story 5.14: Quote Generation — Full PDF Workflow

Status: review

## Story

**As a** business user,
**I want** to configure my invoice settings once in the knowledge base, then generate a professional PDF quote from any email with a split-screen preview and inline editing, and send it as an attachment with one click,
**so that** I can produce and send a quote in under a minute without leaving the inbox.

---

## Acceptance Criteria

**Given** the user navigates to the Knowledge Base settings  
**When** they open the "Paramètres de devis" section  
**Then** they see a mode toggle: "Automatique" or "Depuis mon modèle"  
**And** a business info form: logo (drag & drop), company name, address, SIRET, VAT number, payment terms, currency, tax rate  
**And** if mode is "Depuis mon modèle", an upload zone appears for a reference PDF or image  
**And** as they fill in the form, a live mini-preview of the invoice header updates in real time  
**And** the settings are saved to `invoice_settings` table on submit  

**Given** the user has NOT configured invoice settings  
**When** they click "Générer le devis" from the email detail view (wired from Story 5.13)  
**Then** the quote dialog opens in a blocked state  
**And** displays an illustration + "Configuration requise" message  
**And** a button "Configurer en 2 min" that navigates to the KB settings invoice section

**Given** the user HAS configured invoice settings  
**When** they click "Générer le devis"  
**Then** a full-screen dialog opens over the inbox with a fade-in animation  
**And** the dialog has a split-screen layout: form panel on the left, PDF preview on the right  
**And** the PDF preview renders via `@react-pdf/renderer` inside a `<PDFViewer>`  
**And** the background behind the dialog is slightly blurred  
**And** pressing Escape or clicking the X closes the dialog without sending  

**Given** the quote dialog is open  
**When** it initialises  
**Then** the client name and address are auto-extracted from the email sender  
**And** a quote number is auto-generated (format: `DEV-YYYYMMDD-XXX` with sequential suffix)  
**And** the date is set to today  
**And** the user's business info is pre-filled from `invoice_settings`  
**And** one empty line item row is shown by default  

**Given** the user edits any field in the form panel  
**When** any value changes  
**Then** the PDF preview re-renders instantly to reflect the change  
**And** the transition uses a subtle fade animation  

**Given** the user is editing line items  
**When** they interact with the line items table  
**Then** they can add a row with a "+ Ajouter une ligne" button  
**And** they can delete any row with a trash icon  
**And** each row has: description (text), quantity (number), unit price (number), total (computed, read-only)  
**And** the subtotal, tax amount, and total TTC are computed and displayed at the bottom  

**Given** the user is satisfied with the quote  
**When** they click "Envoyer en PJ" (primary button)  
**Then** the PDF blob is attached to the email reply  
**And** the reply is sent with the subject pre-filled as `Devis — [original email subject]`  
**And** the dialog closes  
**And** a subtle success animation plays (animated green check + "Devis envoyé à [Client Name]")  
**And** the draft status badge updates to "Envoyé"  

**Given** the user wants the PDF only  
**When** they click "Télécharger"  
**Then** the PDF is downloaded locally without sending  

**Given** the user is in the quote dialog  
**When** they look at the bottom of the dialog  
**Then** they see a collapsed preview of the email that will be sent (subject, recipient)  

---

## Tasks / Subtasks

- [x] **Migration 026** — `invoice_settings` table (AC: 1)
  - [x] Create `supabase/migrations/026_invoice_settings.sql`
  - [x] Table definition with `last_quote_sequence` column included
  - [x] Apply migration via MCP — applied to agent-mail project

- [x] **Invoice settings section in Knowledge Base** (AC: 1)
  - [x] Create `components/knowledge-base/invoice-settings-section.tsx`
  - [x] Mode toggle, business info form, live mini-preview, "Sauvegarder" button
  - [x] Template upload zone shown conditionally when mode is "Depuis mon modèle"
  - [x] Wire into `app/(app)/knowledge-base/page.tsx`
  - [x] API route: `app/api/invoice-settings/route.ts` — GET, POST (upsert), PATCH (increment sequence)

- [x] **Quote extraction utility** (AC: 4)
  - [x] Create `lib/quotes/extract-client-info.ts` — parses name + address heuristic
  - [x] Create `lib/quotes/generate-quote-number.ts` — DEV-YYYYMMDD-XXX format

- [x] **PDF template** (AC: 3, 5, 6)
  - [x] Install `@react-pdf/renderer`
  - [x] Create `lib/quotes/pdf-template.tsx` — Document with header, client block, line items table, totals, footer

- [x] **Quote dialog** (AC: 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Create `components/quotes/quote-dialog.tsx` — full-screen overlay, fade-in, Escape to close, blurred backdrop, blocked state, split view
  - [x] Create `components/quotes/quote-form.tsx` — client fields, line items, totals, collapsible email preview
  - [x] Create `components/quotes/quote-line-items.tsx` — description/qty/price/total table with add/delete
  - [x] Create `components/quotes/quote-pdf-preview.tsx` — dynamic PDFViewer (no SSR)
  - [x] "Envoyer en PJ" — PDF blob → base64 → server action → sends with attachment
  - [x] "Télécharger" — local download
  - [x] "Annuler" — closes dialog

- [x] **Wire up from 5.13 PdfConfirmationBlock** (AC: 2, 3)
  - [x] `draft-section.tsx`: `quoteDialogOpen` state, renders `<QuoteDialog>` with email context
  - [x] `onGenerate` in PdfConfirmationBlock now opens quote dialog

- [x] **Success animation** (AC: 8)
  - [x] Green check overlay with "Devis envoyé à [Client Name]" — auto-dismisses after 2.5s

- [x] **Tests** (AC: 1, 2, 3, 4, 5, 6)
  - [x] `extract-client-info.test.ts` — 4 tests
  - [x] `generate-quote-number.test.ts` — 4 tests
  - [x] `invoice-settings-section.test.tsx` — 5 tests
  - [x] `quote-line-items.test.tsx` — 5 tests
  - [x] `quote-dialog.test.tsx` — 5 tests

---

## Dev Notes

### QuoteData Type

```typescript
// lib/quotes/types.ts
export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export interface QuoteData {
  quoteNumber: string
  date: string                   // ISO date string
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

// Derived (computed in component, not stored)
export interface QuoteTotals {
  subtotalHT: number
  taxAmount: number
  totalTTC: number
}
```

### PDF Generation for Send

```typescript
// In quote-dialog.tsx — on "Envoyer en PJ"
import { pdf } from '@react-pdf/renderer'
import { QuotePDFTemplate } from '@/lib/quotes/pdf-template'

const blob = await pdf(<QuotePDFTemplate data={quoteData} />).toBlob()
const file = new File([blob], `devis-${quoteData.quoteNumber}.pdf`, { type: 'application/pdf' })
// Pass `file` to the existing send-email action as an attachment
```

### Blocked State Design

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│          [illustration — document with lock]            │
│                                                          │
│    Génération de devis non configurée                    │
│    Renseignez vos informations commerciales              │
│    pour pouvoir générer des devis.                       │
│                                                          │
│         [Configurer en 2 min]                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Quote Dialog Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Nouveau devis                              [Annuler] [Envoyer] │
├───────────────────────────┬─────────────────────────────────────┤
│  CLIENT                   │                                     │
│  Nom ________________     │                                     │
│  Adresse _____________    │        PDF PREVIEW                  │
│                           │        (PDFViewer)                  │
│  LIGNES                   │                                     │
│  [desc] [qty] [pu] [tot]  │                                     │
│  ─────────────────────    │                                     │
│  + Ajouter une ligne      │                                     │
│                           │                                     │
│  Sous-total HT   1 000 €  │                                     │
│  TVA 20%           200 €  │                                     │
│  Total TTC       1 200 €  │                                     │
│                           │                                     │
│  ▼ Email à envoyer        │                                     │
│  À: client@example.com    │                                     │
│  Objet: Devis — [sujet]   │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

### Invoice Settings Section Placement

Add a new collapsible section "Devis & Facturation" at the bottom of the existing Knowledge Base settings page. If the KB settings page is structured with tabs, add a dedicated "Devis" tab.

### Logo Upload

```typescript
// Upload to Supabase Storage bucket 'logos' (create bucket if needed — private, RLS)
const { data } = await supabase.storage
  .from('logos')
  .upload(`${userId}/logo`, file, { upsert: true })
const logoUrl = supabase.storage.from('logos').getPublicUrl(`${userId}/logo`).data.publicUrl
```

Consider making the bucket private and using signed URLs for security. For v1, a private bucket with signed URL (1 hour TTL) passed to the PDF template is acceptable.

### Send with Attachment

The existing send-email flow (Story 5.3) must accept an optional `attachments` array. If the current action signature does not support it, add `attachments?: File[]` as an optional param — backwards-compatible change.

### Files to Create / Modify

| File | Change |
|---|---|
| `supabase/migrations/026_invoice_settings.sql` | New migration |
| `lib/quotes/types.ts` | QuoteData, QuoteLineItem types |
| `lib/quotes/pdf-template.tsx` | React-PDF document template |
| `lib/quotes/extract-client-info.ts` | Client name/address extraction |
| `lib/quotes/generate-quote-number.ts` | Quote number generator |
| `components/knowledge-base/invoice-settings-section.tsx` | New settings section |
| `app/api/invoice-settings/route.ts` | GET + UPSERT endpoint |
| `components/quotes/quote-dialog.tsx` | Full-screen quote dialog |
| `components/quotes/quote-form.tsx` | Left panel — editable fields |
| `components/quotes/quote-line-items.tsx` | Line items table |
| `components/quotes/quote-pdf-preview.tsx` | Right panel — PDF viewer |
| `components/draft/pdf-confirmation-block.tsx` | Wire onGenerate to open dialog |
| `components/draft/draft-section.tsx` | Add quoteDialogOpen state + render dialog |
| `app/(app)/inbox/[emailId]/page.tsx` | Pass email context to draft section |

### Architecture Compliance

- PDF generation is entirely client-side — no new edge functions, no server round-trip
- `invoice_settings` RLS: owner-based (`auth.uid() = user_id`) — consistent with existing tables
- Logo stored in Supabase Storage — consistent with KB file storage pattern
- Send attachment extends existing send flow — no new email sending mechanism
- All LLM calls remain server-side only — no AI in this story
- Migration numbered 026 (after 025_emails_updated_at.sql)

### Testing Requirements

- Run `npm run typecheck && npm run lint && npm test` before committing
- All existing tests must continue to pass
- `@react-pdf/renderer` components cannot be fully tested with jsdom — mock `PDFViewer` in test environment

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- Migration 026 created and applied to production: `invoice_settings` table with owner-based RLS and `last_quote_sequence` column
- `@react-pdf/renderer` installed
- `lib/quotes/types.ts`: QuoteData, QuoteLineItem, QuoteTotals, InvoiceSettings interfaces
- `lib/quotes/extract-client-info.ts`: parses sender name from From header, regex heuristic for French postal addresses
- `lib/quotes/generate-quote-number.ts`: DEV-YYYYMMDD-XXX format, sequential counter
- `lib/quotes/pdf-template.tsx`: React-PDF Document with header, client block, line items table (grey-striped), totals (HT/TVA/TTC), payment terms footer
- `app/api/invoice-settings/route.ts`: GET (fetch settings), POST (upsert), PATCH (increment sequence + return quote number)
- `components/knowledge-base/invoice-settings-section.tsx`: mode toggle, live mini-preview, all business fields, template upload zone (conditional), save via fetch
- `app/(app)/knowledge-base/page.tsx`: fetches invoice_settings in parallel, renders InvoiceSettingsSection
- `components/quotes/quote-line-items.tsx`: inline editing table with add/delete, computed total column
- `components/quotes/quote-form.tsx`: left panel with client info, date, line items, totals, collapsible email preview
- `components/quotes/quote-pdf-preview.tsx`: dynamic import PDFViewer (no SSR)
- `components/quotes/quote-dialog.tsx`: full-screen overlay dialog, fade-in animation, Escape to close, blurred backdrop, blocked state with CTA, success overlay with green check
- `components/draft/draft-section.tsx`: `quoteDialogOpen` state, QuoteDialog dynamically imported, email context passed as props
- `app/(app)/inbox/[emailId]/page.tsx`: emailFrom/emailBody/emailSubject passed to DraftSection
- `app/(app)/inbox/[emailId]/send-quote-action.ts`: server action — fetches email+connection+credentials, sends via provider with PDF attachment
- `lib/email/send.ts`: EmailAttachment interface added to SendEmailParams
- `lib/email/gmail.ts`: buildRfc2822Message extended for multipart MIME with base64 attachments
- `lib/email/outlook.ts`: sendViaOutlook extended with Graph API attachments array
- 301 tests pass (36 test files)

### File List
- `supabase/migrations/026_invoice_settings.sql` (new)
- `lib/quotes/types.ts` (new)
- `lib/quotes/extract-client-info.ts` (new)
- `lib/quotes/generate-quote-number.ts` (new)
- `lib/quotes/pdf-template.tsx` (new)
- `app/api/invoice-settings/route.ts` (new)
- `components/knowledge-base/invoice-settings-section.tsx` (new)
- `components/quotes/quote-line-items.tsx` (new)
- `components/quotes/quote-form.tsx` (new)
- `components/quotes/quote-pdf-preview.tsx` (new)
- `components/quotes/quote-dialog.tsx` (new)
- `app/(app)/inbox/[emailId]/send-quote-action.ts` (new)
- `lib/quotes/extract-client-info.test.ts` (new)
- `lib/quotes/generate-quote-number.test.ts` (new)
- `components/knowledge-base/invoice-settings-section.test.tsx` (new)
- `components/quotes/quote-line-items.test.tsx` (new)
- `components/quotes/quote-dialog.test.tsx` (new)
- `app/(app)/knowledge-base/page.tsx` (modified)
- `components/draft/draft-section.tsx` (modified)
- `app/(app)/inbox/[emailId]/page.tsx` (modified)
- `lib/email/send.ts` (modified)
- `lib/email/gmail.ts` (modified)
- `lib/email/outlook.ts` (modified)

### Change Log
- 2026-04-09: Implemented Story 5.14 — quote generation PDF workflow. All ACs satisfied. 301 tests pass.
