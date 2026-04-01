# Story 5.1: Asynchronous Draft Generation Pipeline

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** draft replies to be generated automatically when my emails sync,
**So that** drafts are ready and waiting for me when I open an email — no waiting.

---

## Acceptance Criteria

**Given** a new email has been categorized and synced
**When** the generate-draft Edge Function is triggered
**Then** the email content is embedded and a pgvector similarity search retrieves relevant KB chunks
**And** the LLM generates a draft grounded exclusively in those KB chunks (no hallucinated data)
**And** a confidence score (0–100) is calculated and stored alongside the draft
**And** the draft record status transitions `pending → generating → ready` (or `error`) with `retry_count` tracked
**And** the draft is available within 10 seconds of sync completion (NFR2)

**Given** the user's LLM quota is exceeded
**When** a draft generation is attempted
**Then** `checkUserLlmQuota(userId)` blocks the call and the draft status is set to `error` with a clear message

**Given** the generate-draft Edge Function fails
**When** the error occurs
**Then** the draft status is `error` with `error_message` populated — never a blank or missing state (NFR19)

---

## Technical Requirements

### 1. Migration: Create `drafts` table

New file: `supabase/migrations/013_drafts.sql`

```sql
-- Migration 013: drafts table for AI-generated email replies
-- Status tracking: pending → generating → ready | error

CREATE TABLE IF NOT EXISTS public.drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id        UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  content         TEXT,  -- NULL while generating, populated when ready
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'generating', 'ready', 'sent', 'rejected', 'error')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  error_message   TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT drafts_unique_per_email UNIQUE (user_id, email_id)
);

-- RLS: users can read/update their own drafts
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY drafts_select_owner ON public.drafts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY drafts_update_owner ON public.drafts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY drafts_insert_owner ON public.drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY drafts_delete_owner ON public.drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fetching drafts by email
CREATE INDEX idx_drafts_email ON public.drafts (email_id);

-- Index for fetching user's drafts by status
CREATE INDEX idx_drafts_user_status ON public.drafts (user_id, status);
```

### 2. LLM Throttling Utility: `lib/ai/throttle.ts`

New file. Provides centralized quota checking before LLM calls.

```typescript
export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
}

export async function checkUserLlmQuota(userId: string): Promise<QuotaCheckResult>
```

**Quota logic (V1 simplified):**
- Check `user_llm_usage` table (create in migration 014 if not exists)
- Limit: 100 LLM calls per user per day (configurable)
- Return `{ allowed: true }` if under limit
- Return `{ allowed: false, reason: 'Daily LLM quota exceeded (100 calls/day)' }` if exceeded

**Migration 014 (if needed - can combine with 013 or separate):**
```sql
CREATE TABLE IF NOT EXISTS public.user_llm_usage (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  call_count  INTEGER NOT NULL DEFAULT 0,
  reset_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Draft Generation Module: `lib/ai/draft.ts`

New file. Core RAG pipeline for draft generation.

```typescript
export interface DraftGenerationResult {
  content: string
  confidenceScore: number
}

export interface DraftGenerationError {
  error: string
  retryable: boolean
}

export async function generateDraft(
  emailSubject: string | null,
  emailFrom: string | null,
  kbChunks: Array<{ content: string; similarity: number }>,
  openAiApiKey: string,
  options?: {
    tone?: 'formal' | 'informal'
    language?: string
    instruction?: string | null
  }
): Promise<DraftGenerationResult | DraftGenerationError>
```

**RAG Pipeline steps:**
1. Construct LLM prompt with:
   - Retrieved KB chunks as context (grounding data)
   - Email subject/sender as recipient context
   - Tone and language preferences (from options)
   - Optional user instruction (for regeneration scenarios)

2. LLM call (OpenAI): `gpt-4o-mini` or `gpt-4o` (temperature 0.7 for creativity)

3. Response parsing: Extract draft content

4. Confidence calculation algorithm:
   - Base score: 50
   - Add up to 30 points based on average KB chunk similarity (higher similarity = higher confidence)
   - Add up to 20 points based on prompt clarity (subject length, clear request)
   - Cap at 0-100 range

**Error handling:**
- Return `DraftGenerationError` with `retryable: true` for network/timeout errors
- Return `retryable: false` for quota exceeded, malformed KB, etc.

### 4. KB Similarity Search Function

Add to `lib/ai/embeddings.ts`:

```typescript
export async function findRelevantKbChunks(
  queryEmbedding: number[],
  userId: string,
  supabaseServiceRoleKey: string,
  options?: {
    limit?: number  // default 5
    minSimilarity?: number  // default 0.7
  }
): Promise<Array<{ content: string; similarity: number }>>
```

**Implementation notes:**
- Use Supabase RPC call to `match_embeddings` function (needs SQL function in migration)
- RPC must be called with service_role key (Edge Function context)
- Return top N chunks with similarity scores above threshold

**Migration addition to 013 or separate 015:**
```sql
-- RPC function for similarity search (service_role only)
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE(
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE e.user_id = p_user_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Only service_role can execute
REVOKE EXECUTE ON FUNCTION public.match_embeddings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_embeddings TO service_role;
```

### 5. generate-draft Edge Function

New directory: `supabase/functions/generate-draft/`
New file: `supabase/functions/generate-draft/index.ts`

**Trigger:** Called by `sync-emails` Edge Function after each email is categorized and stored.

**Function signature:**
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

serve(async (req) => {
  // Expects: { emailId: string, userId: string }
  // Triggered by sync-emails Edge Function
})
```

**Workflow:**
1. Parse request body (emailId, userId)
2. Fetch email metadata from `emails` table
3. Create draft record with status `pending` (or update if exists)
4. **Check LLM quota** via `checkUserLlmQuota(userId)`
   - If exceeded: update draft status to `error`, set `error_message`, return
5. Transition status to `generating`
6. Generate embedding for email subject/sender via `generateEmbedding()`
7. Retrieve relevant KB chunks via `findRelevantKbChunks()`
8. If no KB chunks found:
   - Generate fallback draft: "Thank you for your email. We will review and respond shortly."
   - Set confidence_score to 20 (low confidence due to lack of grounding)
9. Call `generateDraft()` with email context and KB chunks
10. On success:
    - Update draft with content and confidence_score
    - Set status to `ready`
    - Increment LLM usage counter
    - Emit Realtime event on `drafts:{user_id}` channel
11. On error:
    - Set status to `error`
    - Set `error_message`
    - If retryable and `retry_count < 3`, could retry (or leave for manual retry)

**Error handling (NFR19):**
- Never leave draft in blank state
- Always populate `error_message` on failure
- Catch all errors and convert to status update

**Deno imports pattern (follow index-kb):**
```typescript
import { generateEmbedding } from 'npm:~/lib/ai/embeddings.ts'
import { generateDraft, checkUserLlmQuota } from 'npm:~/lib/ai/draft.ts'
```

### 6. Update sync-emails Edge Function to trigger generate-draft

File: `supabase/functions/sync-emails/index.ts`

After storing each email with category/priority, invoke `generate-draft` Edge Function:

```typescript
// After storeEmails() for each email
for (const email of processedEmails) {
  try {
    // Invoke generate-draft Edge Function asynchronously (fire-and-forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-draft`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: email.id,
        userId: email.user_id,
      }),
    }).catch(err => {
      console.error('Failed to invoke generate-draft:', err)
      // Don't block sync on draft generation failure
    })
  } catch (e) {
    console.error('Error triggering draft generation:', e)
  }
}
```

**Important:** Fire-and-forget pattern — don't `await` the fetch, let sync complete quickly while drafts generate asynchronously.

### 7. Draft module test: `lib/ai/draft.test.ts`

Follow pattern from `lib/ai/triage.test.ts` and `lib/ai/embeddings.test.ts`.

**Required test cases:**
1. Returns generated draft and confidence score when LLM call succeeds
2. Returns error with `retryable: true` when network error occurs
3. Returns error with `retryable: false` when quota exceeded
4. Calculates confidence score based on KB chunk similarity
5. Includes tone and language preferences in generated prompt
6. Handles optional instruction parameter for regeneration

### 8. Throttle module test: `lib/ai/throttle.test.ts`

**Required test cases:**
1. Returns `allowed: true` when user under quota
2. Returns `allowed: false` when user exceeded daily limit
3. Resets counter after 24 hours

---

## File Locations

| File | Action |
|------|--------|
| `supabase/migrations/013_drafts.sql` | New migration - drafts table |
| `supabase/migrations/014_user_llm_usage.sql` | New migration - quota tracking (or combine with 013) |
| `supabase/migrations/015_match_embeddings_rpc.sql` | New migration - similarity search RPC (or combine) |
| `lib/ai/throttle.ts` | New throttling utility |
| `lib/ai/throttle.test.ts` | Tests for throttling |
| `lib/ai/draft.ts` | New draft generation module (RAG pipeline) |
| `lib/ai/draft.test.ts` | Tests for draft generation |
| `lib/ai/embeddings.ts` | Add `findRelevantKbChunks()` function |
| `supabase/functions/generate-draft/index.ts` | New Edge Function |
| `supabase/functions/sync-emails/index.ts` | Update to trigger generate-draft |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **DraftStatus strict enum only:** Never use free strings. Always use `'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'` type.
- **Status transition tracking:** Every draft must transition `pending → generating → ready|error`. Never skip states.
- **Error state population:** On any failure, populate `error_message` column — never leave blank (NFR19).
- **RLS on all draft operations:** Users can only access their own drafts.
- **LLM quota check:** Always call `checkUserLlmQuota()` before LLM API call.
- **Service role for similarity search:** The `match_embeddings` RPC must use service_role — never expose to anon/authenticated.
- **Fire-and-forget pattern:** sync-emails should not await generate-draft; drafts are async by design.

### Database Conventions

- Migration number: `013` (current highest is `012_vault_read_wrapper.sql`)
- Table name: `drafts` (plural, snake_case)
- Foreign keys: `user_id`, `email_id` with `ON DELETE CASCADE`
- Constraint: `drafts_unique_per_email` — one draft per email per user

### Deno/Edge Function Conventions

- Import from `lib/ai/` using `npm:~/lib/ai/*.ts` pattern (established in `index-kb`)
- Environment variables via `Deno.env.get()`
- Service role key for DB operations that bypass RLS

### Error Handling Conventions

```typescript
// Draft generation result type - explicit error path
interface DraftGenerationError {
  error: string
  retryable: boolean  // true = can retry, false = permanent error
}
```

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 3-2: Knowledge Base Indexing Pipeline — embeddings table and generation must exist
- Story 4-1: Automatic Email Categorization — sync-emails structure is already in place

**Related ongoing work:**
- Story 5-2 through 5-6 will build on this foundation (UI for draft viewing, sending, editing)

---

## Context from Previous Stories

**Architecture decisions already in place:**
- `lib/ai/embeddings.ts` generates OpenAI embeddings via `fetch`
- `lib/ai/triage.ts` shows the pattern for LLM calls from Edge Functions
- `supabase/functions/index-kb/index.ts` demonstrates Deno imports from `lib/ai/`
- `sync-emails` Edge Function exists and has service role access
- Embeddings table (`010_embeddings.sql`) with pgvector is ready for similarity search

**Pattern for LLM modules:**
```typescript
// lib/ai/*.ts pattern
export async function functionName(args, apiKey: string): Promise<ResultType> {
  const response = await fetch(OPENAI_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    // ...
  })
  // parse and return
}
```

**Deno import pattern:**
```typescript
// In Edge Function
import { generateEmbedding } from 'npm:~/lib/ai/embeddings.ts'
```

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `generateEmbedding` updated to accept optional `apiKey` parameter so it works both in Node.js (reads from `process.env`) and from Deno Edge Functions (passed explicitly). Existing tests unaffected.
- `sync-emails` storeEmails now selects `id, user_id` from the upsert result to trigger `generate-draft` per stored email in fire-and-forget fashion.

### Completion Notes List

- Created migrations 013 (drafts), 014 (user_llm_usage), 015 (match_embeddings RPC)
- Implemented `lib/ai/throttle.ts` with `checkUserLlmQuota` and `incrementUserLlmUsage`; 5 tests all pass
- Implemented `lib/ai/draft.ts` with full RAG pipeline (prompt builder, confidence score algorithm, error classification); 7 tests all pass
- Added `findRelevantKbChunks` to `lib/ai/embeddings.ts` using Supabase RPC `match_embeddings`
- Created `supabase/functions/generate-draft/index.ts`: full status lifecycle (pending→generating→ready|error), LLM quota check, fallback draft when no KB chunks, Realtime broadcast on success
- Updated `sync-emails/index.ts` storeEmails to fire-and-forget invoke `generate-draft` after upsert
- All 104 tests pass (16 test files); typecheck and lint: clean

### File List

- `supabase/migrations/013_drafts.sql` (new)
- `supabase/migrations/014_user_llm_usage.sql` (new)
- `supabase/migrations/015_match_embeddings_rpc.sql` (new)
- `lib/ai/throttle.ts` (new)
- `lib/ai/throttle.test.ts` (new)
- `lib/ai/draft.ts` (new)
- `lib/ai/draft.test.ts` (new)
- `lib/ai/embeddings.ts` (modified — added `findRelevantKbChunks`, optional `apiKey` param)
- `supabase/functions/generate-draft/index.ts` (new)
- `supabase/functions/sync-emails/index.ts` (modified — fire-and-forget draft trigger)
- `_bmad-output/implementation-artifacts/5-1-asynchronous-draft-generation-pipeline.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

---

## Change Log

- 2026-04-01: Story 5.1 implemented — asynchronous draft generation pipeline (migrations, throttle, draft module, generate-draft Edge Function, sync-emails trigger)

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.1 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Naming conventions, error handling, async pipeline patterns
- [Source: `types/draft.ts`] — DraftStatus enum and Draft interface (already exists)
- [Source: `lib/ai/triage.ts`] — Pattern for LLM calls from Edge Functions
- [Source: `lib/ai/embeddings.ts`] — Embedding generation pattern
- [Source: `supabase/functions/index-kb/index.ts`] — Deno import pattern from lib/ai
- [Source: `supabase/migrations/010_embeddings.sql`] — Embeddings table schema for similarity search
