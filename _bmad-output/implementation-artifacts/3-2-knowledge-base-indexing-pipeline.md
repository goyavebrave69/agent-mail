# Story 3.2: Knowledge Base Indexing Pipeline

Status: done

## Story

As a user,
I want my uploaded files to be automatically indexed within 60 seconds,
So that the AI can immediately use my business data in newly generated drafts.

## Acceptance Criteria

1. **Given** a `kb_files` record exists with status `pending`
   **When** the `index-kb` Edge Function is triggered (HTTP POST from pg_cron or direct call)
   **Then** the file is downloaded from Supabase Storage and parsed (CSV rows or Excel rows extracted as text chunks)
   **And** embeddings are generated and stored in the `embeddings` table (pgvector) scoped by `user_id` with RLS
   **And** the `kb_files` record status is updated to `ready` within 60 seconds (NFR3)

2. **Given** the indexing fails (malformed file, parsing error, embedding API error)
   **When** the error occurs
   **Then** the `kb_files` status is set to `error` with a descriptive `error_message`
   **And** any partially inserted embeddings for this file are cleaned up

## Tasks / Subtasks

- [x] Task 1: DB migration — `embeddings` table with pgvector (AC: 1)
  - [x] Create `supabase/migrations/010_embeddings.sql`
  - [x] Enable `vector` extension: `CREATE EXTENSION IF NOT EXISTS vector`
  - [x] Table: `id UUID PK`, `user_id UUID NOT NULL FK auth.users ON DELETE CASCADE`, `kb_file_id UUID NOT NULL FK kb_files ON DELETE CASCADE`, `content TEXT NOT NULL`, `embedding vector(1536) NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - [x] Enable RLS; policy: `SELECT` for `auth.uid() = user_id`; only service_role can INSERT/DELETE
  - [x] Index: `ivfflat` on `embedding` for cosine similarity

- [x] Task 2: `lib/ai/embeddings.ts` — embedding generation helper (AC: 1)
  - [x] Create `lib/ai/embeddings.ts`
  - [x] Export `generateEmbedding(text: string): Promise<number[]>` — calls OpenAI `text-embedding-ada-002`
  - [x] Handle API errors: throw with descriptive message

- [x] Task 3: `supabase/functions/index-kb/index.ts` — Edge Function (AC: 1, 2)
  - [x] Create `supabase/functions/index-kb/index.ts`
  - [x] Deno runtime — same `globalThis` cast pattern as `sync-emails/index.ts`
  - [x] HTTP POST handler: accepts `{ kb_file_id: string }` in request body
  - [x] Fetch the `kb_files` row — validate it exists and status is `pending`
  - [x] Download file from Supabase Storage using service role client
  - [x] Parse CSV via `npm:papaparse`; Excel via `npm:xlsx`
  - [x] Chunk rows into groups of 20
  - [x] For each chunk: call OpenAI embeddings API → insert into `embeddings` table
  - [x] On success: update `kb_files.status = 'ready'`
  - [x] On error: cleanup embeddings, update `kb_files.status = 'error'` with message

- [x] Task 4: Trigger indexing after upload (AC: 1)
  - [x] Modified `app/(app)/knowledge-base/actions.ts` — fire-and-forget fetch to `/functions/v1/index-kb`
  - [x] Does not fail upload if trigger fails

- [x] Task 5: Tests for `lib/ai/embeddings.ts` (AC: 1, 2)
  - [x] Created `lib/ai/embeddings.test.ts` — 3 tests, all passing
  - [x] Test: successful embedding returns `number[]` of length 1536
  - [x] Test: API error throws descriptive message
  - [x] Test: missing API key throws before fetch

- [x] Task 6: Tests for `uploadKbFileAction` trigger (AC: 1)
  - [x] Added 2 tests to `app/(app)/knowledge-base/actions.test.ts`
  - [x] Test: after successful upload, fetch is called with correct URL and body
  - [x] Test: trigger fetch failure does not affect action return value

### Review Findings

- [x] [Review][Decision] Accès non contraint à `index-kb` — stratégie retenue: endpoint interne uniquement (`service-role only`) avec vérification stricte du header `Authorization` côté Edge Function.
- [x] [Review][Patch] Imports `npm:` incompatibles avec la règle Deno `no-import-prefix` dans la CI [supabase/functions/index-kb/index.ts:1]
- [x] [Review][Patch] Les erreurs de parsing CSV (`Papa.parse().errors`) ne sont pas traitées, ce qui peut marquer `ready` un fichier malformé [supabase/functions/index-kb/index.ts:81]

## Dev Notes

### Architecture Overview

```
uploadKbFileAction (Next.js server action)
  → INSERT kb_files (status: pending)
  → fetch POST /functions/v1/index-kb { kb_file_id }  ← fire-and-forget

index-kb Edge Function (Deno)
  → GET kb_files row (service role)
  → Storage.download(storage_path)
  → parse CSV or Excel → text chunks
  → for each chunk: OpenAI embed → INSERT embeddings
  → UPDATE kb_files SET status = 'ready'
  (on error: DELETE embeddings WHERE kb_file_id, UPDATE kb_files SET status = 'error')
```

### DB Schema — `embeddings`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kb_file_id  UUID NOT NULL REFERENCES public.kb_files(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### OpenAI Embedding API

```typescript
// POST https://api.openai.com/v1/embeddings
// Headers: Authorization: Bearer {OPENAI_API_KEY}
// Body: { model: "text-embedding-ada-002", input: string }
// Response: { data: [{ embedding: number[] }] }
```

Model: `text-embedding-ada-002` — 1536 dimensions, matches `vector(1536)` in DB.

### CSV Parsing in Deno (papaparse)

```typescript
import Papa from 'npm:papaparse'

const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
const chunks = chunkRows(result.data)
```

### Excel Parsing in Deno (xlsx)

```typescript
import * as XLSX from 'npm:xlsx'

const workbook = XLSX.read(arrayBuffer, { type: 'array' })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
```

### Chunking Strategy

```typescript
function chunkRows(rows: Record<string, unknown>[], chunkSize = 20): string[] {
  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    const text = slice
      .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', '))
      .join('\n')
    chunks.push(text)
  }
  return chunks
}
```

### Edge Function Pattern (follow sync-emails/index.ts)

```typescript
// supabase/functions/index-kb/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

const denoGlobal = globalThis as typeof globalThis & { Deno?: { env: { get: (k: string) => string | undefined }; serve: (h: (r: Request) => Response | Promise<Response>) => void } }
const deno = denoGlobal.Deno!

const supabase = createClient(
  deno.env.get('SUPABASE_URL')!,
  deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

deno.serve(async (req: Request): Promise<Response> => {
  // ...
})
```

### Fire-and-Forget Trigger Pattern

```typescript
// In uploadKbFileAction — after successful INSERT
const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/index-kb`
fetch(fnUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ kb_file_id: inserted.id }),
}).catch((err) => console.error('[index-kb trigger]', err))
// No await — returns immediately
```

### Deno Linting Note (from story 2.5 review)

The `sync-emails` function was updated to fix Deno lint errors. Follow the exact same `globalThis` cast pattern. The `eslint.config.mjs` already ignores `supabase/functions/**`. The `tsconfig.json` already excludes `supabase/functions`.

### lib/ai/embeddings.ts — Node.js context

This file lives in `lib/` (Next.js Node.js context). Use `process.env.OPENAI_API_KEY`. The Edge Function has its own inline fetch call to avoid Deno/Node cross-context issues.

### File Structure to Create/Modify

```
New files:
  supabase/migrations/010_embeddings.sql
  supabase/functions/index-kb/index.ts
  lib/ai/embeddings.ts
  lib/ai/embeddings.test.ts

Modify:
  app/(app)/knowledge-base/actions.ts  (add fire-and-forget trigger)
  app/(app)/knowledge-base/actions.test.ts  (add trigger tests)
```

### Testing Pattern

- `lib/ai/embeddings.test.ts`: mock `fetch` globally with `vi.stubGlobal`
- `actions.test.ts` trigger tests: mock `fetch` globally, verify call after successful upload

### References

- Architecture: pgvector + Edge Functions [architecture.md Data Architecture]
- FR27/FR28: [prd.md Knowledge Base Management]
- NFR3 (60s indexing): [prd.md Performance]
- Edge Function pattern: [supabase/functions/sync-emails/index.ts]
- kb_files schema: [supabase/migrations/008_kb_files.sql]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Migration 010: `embeddings` table with `vector(1536)`, RLS (SELECT owner), ivfflat index for cosine similarity; `vector` extension enabled
- `lib/ai/embeddings.ts`: `generateEmbedding()` using OpenAI `text-embedding-ada-002`, throws on API error or missing key
- Edge Function `supabase/functions/index-kb/index.ts`: Deno runtime, parses CSV (papaparse) + Excel (xlsx), chunks rows by 20, generates+inserts embeddings, marks `ready`/`error` with cleanup on failure
- `uploadKbFileAction` now fire-and-forgets a POST to `/functions/v1/index-kb` after successful insert — upload returns success regardless of trigger outcome
- 3 tests for embeddings helper + 2 trigger tests added to actions.test.ts — 65/65 total, typecheck + lint clean

### File List

- `supabase/migrations/010_embeddings.sql` (new)
- `supabase/functions/index-kb/index.ts` (new)
- `lib/ai/embeddings.ts` (new)
- `lib/ai/embeddings.test.ts` (new)
- `app/(app)/knowledge-base/actions.ts` (modified — added trigger)
- `app/(app)/knowledge-base/actions.test.ts` (modified — added 2 trigger tests)
