# Story 5.17: Quote Flow UX Fixes — Attachment Preview, Send Sequencing & Dialog Sync

Status: ready-for-dev

## Story

**As a** business user,
**I want** to see the PDF quote as a visible attachment in my compose area after validating the preview, control when the email is actually sent, and not see the success overlay while the preview is still closing,
**so that** I can write or generate the email body freely before sending, and experience a smooth, predictable quote workflow.

---

## Acceptance Criteria

**AC1 — Attachment indicator after quote validation**
**Given** the user has validated a quote in QuoteDialog (clicked "Envoyer en PJ")
**When** the dialog closes
**Then** an attachment chip/badge is visible in the compose area showing the PDF filename (e.g. `Devis-DEV-20260524-001.pdf`)
**And** the chip shows a PDF icon + filename + file size
**And** a ✕ button on the chip allows removing the attachment (cancelling the quote send)

**AC2 — Email is NOT sent automatically on quote validation**
**Given** the user clicks "Envoyer en PJ" in QuoteDialog
**When** the dialog closes
**Then** the email is NOT sent immediately
**And** the compose area opens (if not already open) with the attachment chip visible
**And** the user can write or generate (via "Brouillon IA") the email body
**And** only clicking the "Répondre" / send button actually sends the email with the PDF attachment

**AC3 — Send with attachment**
**Given** the user has a pending PDF attachment in the compose area
**When** they click the send button
**Then** the email is sent via `sendManualReply` with the PDF base64 attachment included
**And** the attachment chip disappears after successful send
**And** the normal post-send flow continues (draft marked sent, compose closes)

**AC4 — No success overlay during dialog close animation**
**Given** the user clicks "Envoyer en PJ" in QuoteDialog
**When** the success overlay appears inside the dialog
**Then** the success overlay only appears AFTER the dialog close animation has completed (or is not shown at all — the attachment chip in compose is confirmation enough)
**And** there is no z-index / timing conflict between the overlay and the dialog close transition

**AC5 — Attachment state is preserved across email selection**
**Given** the user has a pending attachment in compose
**When** they click a different email in the list
**Then** the pending attachment is discarded (with no silent send)
**And** the compose area closes cleanly

---

## Technical Context

### Current Flow (broken)
1. User validates quote in `QuoteDialog` → `handleSend()` is called
2. `handleSend()` generates PDF blob → calls `sendQuoteAction()` → **email sent immediately**
3. Success overlay shown inside dialog → dialog closes
4. Bug: success overlay z-index conflicts with dialog close animation

### Target Flow (fixed)
1. User validates quote in `QuoteDialog` → PDF blob generated → stored in state (NOT sent yet)
2. Dialog closes → `onQuoteReady(pdfBlob, filename)` callback fires
3. `DraftSection` receives the blob → stores it as `pendingAttachment` state
4. Attachment chip shown in compose area
5. User writes body (manual or AI draft)
6. User clicks send → `sendManualReply` called with attachment included
7. On success → attachment cleared

### Key Files to Modify

| File | Change |
|------|--------|
| `components/quotes/quote-dialog.tsx` | Replace `handleSend` → generate PDF blob + call `onQuoteReady(blob, filename)` instead of `sendQuoteAction`. Remove success overlay or delay it. |
| `components/draft/draft-section.tsx` | Add `pendingAttachment` state. Pass `onQuoteReady` to QuoteDialog. Open compose on attachment ready. Pass attachment to ManualCompose. |
| `components/draft/manual-compose.tsx` | Accept optional `attachment` prop. Show attachment chip in compose UI. Pass attachment through to send handler. |
| `app/(app)/inbox/[emailId]/actions.ts` | Update `sendManualReply` to accept optional `attachment: { filename: string; contentBase64: string; contentType: string }` and forward it to `sendEmailViaProvider`. |
| `lib/email/send.ts` | Ensure `sendEmailViaProvider` supports attachment param for gmail/outlook/imap. |
| `app/(app)/inbox/[emailId]/send-quote-action.ts` | May become unused or repurposed — do not delete, just stop calling it from QuoteDialog. |

### PDF Blob Generation (existing logic in quote-dialog.tsx)
```typescript
// Already exists — reuse this pattern:
const blob = await pdf(<QuotePDFTemplate data={quoteData} settings={invoiceSettings} />).toBlob()
const arrayBuffer = await blob.arrayBuffer()
const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
```
Store `{ blob, contentBase64, filename }` and pass via callback instead of calling `sendQuoteAction`.

### Attachment Chip UI
Small chip below the compose header (above textarea):
```
[📎 Devis-DEV-20260524-001.pdf  •  42 KB  ✕]
```
- Tailwind: `flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs`
- ✕ clears `pendingAttachment` state in DraftSection

### Success Overlay Fix (AC4)
Option A (simplest): Remove the success overlay entirely from QuoteDialog — the attachment chip is the confirmation.
Option B: Delay overlay render until after dialog close (`setTimeout(300ms)` matching dialog animation).
**Prefer Option A** — less complexity, attachment chip is clear enough feedback.

### sendManualReply signature update
```typescript
// Current
export async function sendManualReply(
  emailId: string,
  content: string,
  options: { to: string; subject: string; isForward: boolean }
): Promise<SendEmailResult>

// Target
export async function sendManualReply(
  emailId: string,
  content: string,
  options: {
    to: string
    subject: string
    isForward: boolean
    attachment?: { filename: string; contentBase64: string; contentType: string }
  }
): Promise<SendEmailResult>
```

---

## Tasks

- [ ] **Task 1 — QuoteDialog: generate blob instead of sending**
  - [ ] 1.1 Replace `handleSend()` logic: generate PDF blob, compute base64, call `onQuoteReady(contentBase64, filename)` prop
  - [ ] 1.2 Remove `sendQuoteAction` call from QuoteDialog
  - [ ] 1.3 Remove success overlay (Option A) — dialog simply closes after `onQuoteReady` fires
  - [ ] 1.4 Add `onQuoteReady: (contentBase64: string, filename: string) => void` to QuoteDialogProps

- [ ] **Task 2 — DraftSection: pending attachment state**
  - [ ] 2.1 Add `pendingAttachment: { contentBase64: string; filename: string; contentType: string } | null` state
  - [ ] 2.2 Implement `handleQuoteReady(contentBase64, filename)`: set pendingAttachment, call `startComposing('reply', ...)` if not already composing
  - [ ] 2.3 Pass `onQuoteReady={handleQuoteReady}` to QuoteDialog
  - [ ] 2.4 Pass `pendingAttachment` to ManualCompose
  - [ ] 2.5 Clear pendingAttachment when compose is cancelled or email changes (`useEffect` on `emailId`)

- [ ] **Task 3 — ManualCompose: attachment chip UI**
  - [ ] 3.1 Accept `attachment?: { filename: string; contentBase64: string; contentType: string } | null` prop
  - [ ] 3.2 Accept `onRemoveAttachment?: () => void` prop
  - [ ] 3.3 Render attachment chip above textarea when attachment is present
  - [ ] 3.4 ✕ button calls `onRemoveAttachment`

- [ ] **Task 4 — sendManualReply: support attachment**
  - [ ] 4.1 Add optional `attachment` to options type
  - [ ] 4.2 Forward attachment to `sendEmailViaProvider`
  - [ ] 4.3 Verify `sendEmailViaProvider` in `lib/email/send.ts` already supports attachment param (it does — used by sendQuoteAction) — if not, add it

- [ ] **Task 5 — DraftSection: wire send with attachment**
  - [ ] 5.1 In `handleSendManual`, pass `pendingAttachment` to `sendManualReply` options
  - [ ] 5.2 On successful send, clear `pendingAttachment`

---

## Dev Notes

- `send-quote-action.ts` calls `sendEmailViaProvider` with attachment already — reuse the same pattern in `sendManualReply`. Do NOT delete `send-quote-action.ts`.
- The `composeQuotedBody` in `useDraftStore` is now unused (quotedBody was removed from compose UI in a previous session) — don't confuse it with the attachment feature.
- `@react-pdf/renderer` `pdf()` function is already imported in `quote-dialog.tsx` — no new dependency needed.
- Keep QuoteDialog's download button (`handleDownload`) working — it's unrelated to this fix.
- The `onNotifyClient` callback path (NoKbMatchState / OutOfScopeState) is unaffected by this story.

---

## Dev Agent Record

_To be filled by dev agent after implementation._

### Implementation Notes
_(empty)_

### Files Modified
_(empty)_

### Tests
_(empty)_
