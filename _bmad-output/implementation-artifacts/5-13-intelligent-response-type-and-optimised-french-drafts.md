# Story 5.13: Intelligent Response-Type Detection & Optimised French Drafts

Status: review

## Story

**As a** business user,
**I want** the AI to detect whether an incoming email requires a plain-text reply or a quote/PDF, generate all drafts in French with my business profile as context, and show a confirmation prompt when a PDF quote is needed,
**so that** every draft is immediately actionable, personalised to my business, and the right format is proposed automatically without extra clicks.

---

## Acceptance Criteria

**Given** a new email arrives  
**When** the triage pipeline runs  
**Then** the email is assigned a `response_type` of either `text_reply` or `pdf_required`  
**And** `pdf_required` is set when the LLM detects a request for a quote, price, estimate, offer, or any commercial proposal — detected semantically, not by keyword matching  
**And** `text_reply` is set for all other emails  
**And** the result is persisted to `emails.response_type`

**Given** the `generate-draft` pipeline is triggered  
**When** the draft LLM call is made  
**Then** the system prompt is written entirely in French  
**And** the user's `user_profile.description` is included as business context  
**And** the generated draft content is in French  
**And** if no profile description exists, the LLM still generates a quality reply without it

**Given** an email has `response_type = 'pdf_required'`  
**When** the user opens the email detail page  
**Then** a confirmation block is displayed above the reply composer  
**And** the block contains: an explanation message, a "Générer le devis" button, and an "Ignorer" link  
**And** clicking "Ignorer" hides the block and shows the normal text reply composer  
**And** clicking "Générer le devis" is a no-op for now (placeholder — PDF generation is a future story)  
**And** the confirmation state (confirmed / ignored) is local UI state only — not persisted to DB

**Given** an email has `response_type = 'text_reply'` or `'unknown'`  
**When** the user opens the email detail page  
**Then** the PDF confirmation block is NOT shown  
**And** the normal draft composer is displayed as before

---

## Tasks / Subtasks

- [x] **Migration 024** — add `response_type` to `emails` table (AC: 1)
  - [x] Create `supabase/migrations/024_emails_response_type.sql`
  - [x] `ALTER TABLE emails ADD COLUMN response_type TEXT NOT NULL DEFAULT 'unknown' CHECK (response_type IN ('text_reply', 'pdf_required', 'unknown'))`
  - [x] Add index: `CREATE INDEX idx_emails_response_type ON emails(user_id, response_type)`
  - [x] Apply migration via MCP or `supabase db push`

- [x] **Triage enhancement** — detect `response_type` during triage (AC: 1)
  - [x] In `supabase/functions/sync-emails/triage.ts`:
    - [x] Extend `TriageResult` interface: add `responseType: 'text_reply' | 'pdf_required'`
    - [x] Update `FALLBACK` constant: `{ category: 'inbox', priorityRank: 0, responseType: 'text_reply' }`
    - [x] Update `buildSystemPrompt()` to request `response_type` in JSON output
    - [x] Update response JSON schema in prompt: `{"category": "<slug>", "response_type": "text_reply" | "pdf_required"}`
    - [x] Increase `max_tokens` from 32 to 64 to accommodate larger JSON response
    - [x] Validate `responseType` value; fallback to `'text_reply'` if missing/invalid
  - [x] In `supabase/functions/sync-emails/index.ts`:
    - [x] Pass `triageResult.responseType` to the emails upsert payload as `response_type`

- [x] **Draft generation improvements** — French + profile context (AC: 2)
  - [x] In `lib/ai/draft.ts`:
    - [x] Add `userProfile: string | null` parameter to `generateDraft()` signature
    - [x] Replace `language: options?.language ?? 'English'` with `'Français'` (hardcoded)
    - [x] Completely rewrite `buildSystemPrompt()` following GPT best practices (see Dev Notes below)
    - [x] Inject `userProfile` into system prompt when present
  - [x] In `supabase/functions/generate-draft/index.ts`:
    - [x] After fetching email metadata, also fetch `user_profile.description` for the user
    - [x] Pass `userProfile` to `generateDraft()` call

- [x] **UI — PDF confirmation block** (AC: 3, 4)
  - [x] Create `components/draft/pdf-confirmation-block.tsx`
    - [x] Props: `onIgnore: () => void`, `onGenerate: () => void`
    - [x] Renders explanation text + "Générer le devis" button + "Ignorer" link
    - [x] No external state — fully controlled via props
  - [x] In `components/draft/draft-section.tsx`:
    - [x] Add `responseType: 'text_reply' | 'pdf_required' | 'unknown'` prop
    - [x] Add local state: `pdfIgnored: boolean` (default `false`)
    - [x] Render `<PdfConfirmationBlock>` when `responseType === 'pdf_required' && !pdfIgnored`
    - [x] On "Ignorer": set `pdfIgnored = true`
    - [x] On "Générer le devis": no-op (placeholder for future story)
  - [x] In `app/(app)/inbox/[emailId]/page.tsx`:
    - [x] Include `response_type` in the email select query
    - [x] Pass `responseType={email.response_type}` to `<DraftSection>`

- [x] **Tests** (AC: 1, 2, 3, 4)
  - [x] Add/update unit tests for `triageEmail()` in `supabase/functions/sync-emails/triage.test.ts` (if exists, otherwise create):
    - [x] Returns `responseType: 'pdf_required'` for quote/devis/tarif request emails
    - [x] Returns `responseType: 'text_reply'` for regular inquiry emails
    - [x] Falls back to `responseType: 'text_reply'` on invalid LLM response
  - [x] Add unit tests for updated `generateDraft()` in `lib/ai/draft.test.ts` (if exists):
    - [x] System prompt contains French language instruction
    - [x] System prompt includes `userProfile` when provided
    - [x] System prompt omits profile section when `userProfile` is null/empty
  - [x] Add component tests for `PdfConfirmationBlock`:
    - [x] Renders correctly with both buttons
    - [x] `onIgnore` called on "Ignorer" click
    - [x] `onGenerate` called on "Générer le devis" click
  - [x] Update `DraftSection` tests:
    - [x] Shows `PdfConfirmationBlock` when `responseType='pdf_required'`
    - [x] Hides block after "Ignorer" click
    - [x] Does NOT show block when `responseType='text_reply'`

---

## Dev Notes

### New System Prompt — GPT Best Practices

Replace the current weak system prompt in `lib/ai/draft.ts` with this optimised version:

```typescript
function buildSystemPrompt(userProfile: string | null, hasKbContext: boolean): string {
  const sections: string[] = []

  sections.push(`# Rôle
Tu es l'assistant email professionnel de l'utilisateur.
Tu rédiges des réponses d'email en français uniquement, même si l'email reçu est dans une autre langue.`)

  if (userProfile?.trim()) {
    sections.push(`# Contexte métier
${userProfile.trim()}`)
  }

  if (hasKbContext) {
    sections.push(`# Base de connaissances
Des extraits de la base de connaissances de l'utilisateur sont fournis ci-après.
Utilise ces informations pour personnaliser la réponse si elles sont pertinentes.
Ne les invente pas — utilise uniquement ce qui est fourni.`)
  }

  sections.push(`# Règles de rédaction
- Langue : français exclusivement
- Ton : professionnel et direct
- Longueur : adaptée au contenu de l'email (courte si question simple, structurée si complexe)
- Format : corps de l'email uniquement — pas d'objet, pas de formule de salutation, pas de signature
- Réponds précisément à ce que demande l'expéditeur
- Ne commence jamais par "Je" — varie les formulations d'ouverture
- N'utilise jamais de formules génériques comme "Je vous remercie de votre email"`)

  return sections.join('\n\n')
}
```

**Why this prompt is better:**
- Structured with `#` headers → GPT processes sections independently, less confusion
- Explicit "même si l'email est dans une autre langue" → prevents English responses to English emails
- Negative constraints explicit ("Ne commence jamais par Je") → prevents common LLM defaults
- Profile injected as a named section, not inline → cleaner context separation
- KB instruction clarifies "utilise uniquement ce qui est fourni" → prevents hallucination

### Triage Prompt Update

Update `buildSystemPrompt` in `triage.ts`:

```typescript
function buildSystemPrompt(categories: UserCategory[]): string {
  const list = categories
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` — ${c.description}` : ''}`)
    .join('\n')

  return `You are an email classifier for a business inbox.

## Task 1 — Category
Classify the email into exactly one of these categories:
${list}

## Task 2 — Response type
Determine if the email requires a quote/estimate/commercial proposal (PDF attachment) or a plain text reply.
Set "response_type" to "pdf_required" if the sender is asking for: a price, quote, estimate, offer, proposal, devis, tarif, or any commercial document.
Set "response_type" to "text_reply" for all other emails.

Respond with valid JSON only:
{"category": "<slug>", "response_type": "text_reply" | "pdf_required"}

Use exact slugs. No explanation, no extra text.`
}
```

### PDF Confirmation Block — UI Design

```
┌──────────────────────────────────────────────────────────────┐
│ 📎  Cet email semble nécessiter un devis                    │
│     L'expéditeur demande une offre commerciale.             │
│                                                              │
│  [Générer le devis]          Ignorer                        │
└──────────────────────────────────────────────────────────────┘
```

- Use `shadcn/ui` Card or a simple bordered div with `bg-muted/30`
- "Générer le devis" → primary button (disabled appearance acceptable for now since it's a no-op)
- "Ignorer" → ghost/link variant

### Fetching `user_profile` in Edge Function

```typescript
// In generate-draft/index.ts — after fetching email metadata
const { data: profileData } = await supabase
  .from('user_profile')
  .select('description')
  .eq('user_id', userId)
  .maybeSingle()

const userProfile = profileData?.description ?? null
```

Use `maybeSingle()` (not `single()`) — profile row may not exist for new users.

### Files to Modify

| File | Change |
|---|---|
| `supabase/migrations/024_emails_response_type.sql` | New migration |
| `supabase/functions/sync-emails/triage.ts` | Add `responseType` to result + prompt |
| `supabase/functions/sync-emails/index.ts` | Store `response_type` on upsert |
| `lib/ai/draft.ts` | New optimised French prompt + `userProfile` param |
| `supabase/functions/generate-draft/index.ts` | Fetch profile + pass to generateDraft |
| `components/draft/pdf-confirmation-block.tsx` | New component |
| `components/draft/draft-section.tsx` | Add `responseType` prop + conditional block |
| `app/(app)/inbox/[emailId]/page.tsx` | Select + pass `response_type` |

### Architecture Compliance

- No new Supabase Realtime channels — `response_type` is static per email after triage
- RLS: `user_profile` already has owner-based RLS (`auth.uid() = user_id`) — safe to query with service role in Edge Function
- `pdf_confirmed` state is **local only** (not persisted) — PDF generation feature is a separate future story
- All LLM calls remain server-side only (NFR10, NFR11)
- `lib/ai/draft.ts` is shared between Edge Function and Node.js — do not use Deno-specific APIs there
- Follow existing `DraftStatus` enum — no new statuses added in this story
- Migration naming: `024_emails_response_type.sql` (next in sequence after `023`)

### Key Constraints

- `lib/ai/draft.ts` is imported by the Edge Function via relative path `../../../lib/ai/draft.ts` — the file must remain TypeScript compatible with both Deno and Node.js runtimes (no `import.meta`, no `Deno.*` in this file)
- `generateDraft()` function signature change is backwards-compatible: `userProfile` added as optional param in `options` object
- `max_tokens: 32` in triage is too small for the new JSON shape — increase to `64`
- The `emails` table upsert in `sync-emails/index.ts` uses `onConflict` — verify that `response_type` is included in the upsert payload correctly alongside existing fields

### Testing Requirements

- Run `npm run typecheck && npm run lint && npm test` before committing
- All 257+ existing tests must continue to pass
- New tests should follow the `vitest` patterns in existing test files
- Edge function code (`triage.ts`) may not have a test file yet — create `supabase/functions/sync-emails/triage.test.ts` if missing, using the same vitest setup

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- Migration 024 created and applied to Supabase (agent-mail project): adds `response_type TEXT NOT NULL DEFAULT 'unknown'` with CHECK constraint and index on `(user_id, response_type)`
- `triage.ts` updated: `TriageResult` extended with `responseType`, prompt updated to Task 1/Task 2 format requesting JSON with `response_type`, `max_tokens` raised to 64, fallback to `text_reply` on invalid LLM output
- `sync-emails/index.ts` updated: `response_type` included in emails upsert payload for both Gmail and Outlook sync paths
- `lib/ai/draft.ts` rewritten: `buildSystemPrompt()` now uses structured French-only prompt with `# Rôle`, `# Contexte métier`, `# Base de connaissances`, `# Format de réponse OBLIGATOIRE` sections; `userProfile` injected as optional param in `options`
- `generate-draft/index.ts` updated: fetches `user_profile.description` via `maybeSingle()` after email metadata, passes `userProfile` to `generateDraft()`
- `pdf-confirmation-block.tsx` created: amber-tinted bordered card with FileText icon, "Générer le devis" button, and "Ignorer" link; fully controlled via props
- `draft-section.tsx` updated: `responseType` prop added, `pdfIgnored` local state, `<PdfConfirmationBlock>` conditionally rendered
- `app/(app)/inbox/[emailId]/page.tsx` updated: `response_type` included in select query, passed to `<DraftSection>`
- All 278 tests pass (typecheck + lint + test green)

### File List
- `supabase/migrations/024_emails_response_type.sql` (new)
- `supabase/functions/sync-emails/triage.ts` (modified)
- `supabase/functions/sync-emails/index.ts` (modified)
- `lib/ai/draft.ts` (modified)
- `supabase/functions/generate-draft/index.ts` (modified)
- `components/draft/pdf-confirmation-block.tsx` (new)
- `components/draft/draft-section.tsx` (modified)
- `app/(app)/inbox/[emailId]/page.tsx` (modified)
- `app/(app)/inbox/[emailId]/actions.ts` (modified — added `response_type` to `EmailDetail` interface and select query)
- `supabase/functions/sync-emails/triage.test.ts` (new)
- `lib/ai/draft.test.ts` (modified — added tests for French prompt, userProfile injection)
- `components/draft/pdf-confirmation-block.test.tsx` (new)
- `components/draft/draft-section.test.tsx` (modified — added PDF block tests)

### Change Log
- 2026-04-09: Implemented Story 5.13 — intelligent response-type detection, optimised French drafts, PDF confirmation UI block. All ACs satisfied, 278 tests pass.
