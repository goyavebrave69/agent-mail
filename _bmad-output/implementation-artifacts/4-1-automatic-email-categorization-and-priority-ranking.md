# Story 4.1: Automatic Email Categorization & Priority Ranking

## Story

**As a** user,
**I want** each incoming email to be automatically categorized and assigned a priority rank,
**So that** I can instantly see what matters most without reading every email.

---

## Status: review

---

## Acceptance Criteria

**Given** a new email is fetched during sync
**When** the sync-emails Edge Function processes it
**Then** the email is categorized as one of: `quote`, `inquiry`, `invoice`, `follow_up`, `spam`, or `other` (strict enum — FR10)
**And** a priority rank is assigned based on category and content signals (FR11)
**And** the category and rank are stored in the email metadata record with RLS applied

**Given** the categorization LLM call fails
**When** the error occurs
**Then** the email is assigned category `other` and a default low priority — never a blank or broken state

---

## Technical Requirements

### 1. Migration: add `category` and `priority_rank` to `emails` table

New file: `supabase/migrations/011_emails_categorization.sql`

```sql
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('quote', 'inquiry', 'invoice', 'follow_up', 'spam', 'other')),
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_emails_user_priority ON public.emails (user_id, priority_rank DESC, received_at DESC);
```

**No new RLS policies needed** — existing `emails_select_owner` and `emails_update_owner` cover these columns.

### 2. Triage module: `lib/ai/triage.ts`

New file. Called by `sync-emails` Edge Function after fetching each email.

```typescript
export type EmailCategory = 'quote' | 'inquiry' | 'invoice' | 'follow_up' | 'spam' | 'other'

export interface TriageResult {
  category: EmailCategory
  priorityRank: number
}

export async function triageEmail(
  subject: string | null,
  fromEmail: string | null,
  openAiApiKey: string
): Promise<TriageResult>
```

**Priority rank mapping** (higher = more urgent):
- `quote` → 100
- `invoice` → 90
- `inquiry` → 70
- `follow_up` → 50
- `other` → 20
- `spam` → 0

**LLM call:** single OpenAI chat completion with a structured prompt asking for the category enum. Parse the response and map to priority. On any error (network, parse, timeout) → return `{ category: 'other', priorityRank: 20 }`.

**Model:** `gpt-4o-mini` (cheap, fast, sufficient for classification).

**Prompt approach:** Zero-shot classification. The prompt should:
1. List the 6 valid categories with definitions
2. Ask for a single-word JSON response: `{"category": "quote"}`
3. Return `other` on ambiguity

### 3. Update `sync-emails` Edge Function

File: `supabase/functions/sync-emails/index.ts`

After fetching emails and before `storeEmails()`, call `triageEmail()` for each email. Pass the result into the stored row:

```typescript
// Add category + priority_rank to storeEmails rows
const rows = emails.map(e => ({
  ...existingFields,
  category: e.category,
  priority_rank: e.priorityRank,
}))
```

Update `storeEmails()` signature to accept category and priority_rank per email, or update the row shape directly.

**Error handling:** if `triageEmail()` throws, catch it per-email, assign `{ category: 'other', priorityRank: 20 }`, and continue — never let one email's triage failure block the entire sync batch.

### 4. Triage module test: `lib/ai/triage.test.ts`

Follow the same pattern as `lib/ai/embeddings.test.ts` — mock global `fetch`.

**Required test cases:**
1. Returns correct category and priority for a clear "quote" email
2. Returns correct category and priority for an "invoice" email
3. Falls back to `{ category: 'other', priorityRank: 20 }` when LLM returns unexpected JSON
4. Falls back to `{ category: 'other', priorityRank: 20 }` when fetch throws (network error)
5. Falls back to `{ category: 'other', priorityRank: 20 }` when LLM returns non-200

---

## File Locations

| File | Action |
|------|--------|
| `supabase/migrations/011_emails_categorization.sql` | New migration |
| `lib/ai/triage.ts` | New triage module |
| `lib/ai/triage.test.ts` | New tests |
| `supabase/functions/sync-emails/index.ts` | Update to call triage + store category/priority |

No UI changes in this story — display is covered in story 4.2.

---

## Dev Guardrails

- **Strict enum only:** `category` column has a CHECK constraint — never insert a free string. Map all LLM output through the enum before storing.
- **Never block sync on triage failure:** wrap each `triageEmail()` call in try/catch per email. Sync must complete even if all triage calls fail.
- **LLM credentials in Edge Function only:** `OPENAI_API_KEY` available via `deno.env.get()` in the Edge Function. The `lib/ai/triage.ts` module receives the key as a parameter (same pattern as `index-kb/index.ts`).
- **Deno compatibility:** `lib/ai/triage.ts` is called from a Deno Edge Function. Use `fetch` directly (no Node.js imports). Follow the exact same pattern as `lib/ai/embeddings.ts` in `index-kb/index.ts`.
- **No migration number conflict:** current highest is `010_*` (two files). Use `011_emails_categorization.sql`.
- **`storeEmails` update:** the existing function upserts with `ignoreDuplicates: true` — adding `category` and `priority_rank` to the upsert rows is safe since the conflict key is `(user_id, provider, provider_email_id)`.

---

## Existing Code Patterns to Follow

**`lib/ai/embeddings.ts` pattern** (for triage.ts):
```typescript
// receives apiKey as param, uses fetch directly, throws descriptive errors
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  const response = await fetch(url, { ... })
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${body}`)
  ...
}
```

**`lib/ai/embeddings.test.ts` pattern** (for triage.test.ts):
```typescript
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)
// mock responses, test success and error paths
```

**`sync-emails` existing `storeEmails`** (migration 005 columns):
```
user_id, provider, provider_email_id, subject, from_email, from_name, received_at
```
Add: `category`, `priority_rank`

---

## Context from Previous Stories

**Architecture decisions already in place:**
- `lib/ai/embeddings.ts` is the established pattern for AI utility modules — one exported function, apiKey as env var, fetch-based, throws on error
- `index-kb/index.ts` shows how Edge Functions import from `lib/ai/` using `npm:` imports in Deno
- The `sync-emails` Edge Function already uses service role key and the `storeEmails()` upsert pattern
- No content stored in DB — `subject`, `from_email`, `from_name` are the only content signals available for triage (per NFR8/FR33)

**Note on `lib/ai/triage.ts` in Deno context:**
The `lib/ai/` files are imported by both Next.js (Node) and Edge Functions (Deno). Keep the triage module dependency-free (only `fetch`). The test file runs in Vitest (Node) — use `vi.stubGlobal("fetch", mockFetch)`.
