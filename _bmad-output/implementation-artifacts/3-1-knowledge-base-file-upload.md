# Story 3.1: Knowledge Base File Upload

Status: review

## Story

As a user,
I want to upload CSV or Excel files as my knowledge base via drag-and-drop,
So that the AI can use my business data (prices, availability, policies) to generate accurate draft replies.

## Acceptance Criteria

1. **Given** the user drags a CSV or Excel file onto the upload zone (or clicks to browse)
   **When** the file is submitted
   **Then** the file is uploaded to Supabase Storage encrypted at rest
   **And** a record is created in the `kb_files` table with status `pending` and RLS applied
   **And** the user sees an upload progress indicator and then an "Indexing…" status

2. **Given** the user uploads a file of an unsupported format (not CSV or .xlsx/.xls)
   **When** the upload is attempted
   **Then** an error message specifies the issue and no file is stored

3. **Given** multiple files are uploaded sequentially
   **When** each upload completes
   **Then** each file is independently tracked with its own `kb_files` row and status

## Tasks / Subtasks

- [x] Task 1: DB migration — `kb_files` table (AC: 1, 3)
  - [x] Create `supabase/migrations/008_kb_files.sql`
  - [x] Table: `id UUID PK`, `user_id UUID FK auth.users ON DELETE CASCADE`, `filename TEXT NOT NULL`, `storage_path TEXT NOT NULL`, `file_size INTEGER NOT NULL`, `mime_type TEXT NOT NULL`, `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','error'))`, `error_message TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - [x] Enable RLS; policy: `SELECT/DELETE` for `auth.uid() = user_id`; `INSERT` for authenticated users (setting `user_id = auth.uid()`)
  - [x] Index: `(user_id, created_at DESC)`

- [x] Task 2: Supabase Storage bucket (AC: 1)
  - [x] Create `supabase/migrations/009_kb_storage.sql`
  - [x] Create bucket `knowledge-base` with `public = false` via `storage.buckets` insert
  - [x] Storage RLS policies: `SELECT/DELETE` for `auth.uid()::text = (storage.foldername(name))[1]`; `INSERT` for authenticated users with path prefix `auth.uid()/`
  - [x] Max file size: 10 MB (enforced client-side + server action)

- [x] Task 3: Server action `uploadKbFileAction` (AC: 1, 2)
  - [x] Create `app/(app)/knowledge-base/actions.ts`
  - [x] Accept `FormData` with a `file` field
  - [x] Validate: mime type must be `text/csv`, `application/vnd.ms-excel`, or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; size ≤ 10 MB
  - [x] Upload to Supabase Storage: path = `{user_id}/{Date.now()}-{filename}` using authenticated client with matching path
  - [x] Insert `kb_files` row with `status = 'pending'`
  - [x] Return `{ id, filename, status }` on success or `{ error: string }` on failure
  - [x] Use `createClient()` from `@/lib/supabase/server` (authenticated client for DB insert — RLS `user_id = auth.uid()` handles scoping)

- [x] Task 4: Knowledge Base page (AC: 1, 2, 3)
  - [x] Create `app/(app)/knowledge-base/page.tsx` — RSC
  - [x] Import and render `<KbUploadZone />` client component
  - [x] Import and render `<KbFileList />` client component (file list with statuses — minimal for this story, full list in story 3.3)
  - [x] Read current `kb_files` for user and pass as initial prop to `<KbFileList />`

- [x] Task 5: `KbUploadZone` client component (AC: 1, 2)
  - [x] Create `components/kb/kb-upload-zone.tsx` — `'use client'`
  - [x] Drag-and-drop zone using HTML5 `dragover`/`drop` events (no extra library)
  - [x] Hidden `<input type="file" accept=".csv,.xls,.xlsx" multiple />` triggered on click
  - [x] On file select: validate mime type + size client-side; display error inline if invalid
  - [x] On valid file: call `uploadKbFileAction` via `useTransition` + `startTransition`
  - [x] Show progress state: "Uploading…" → on success shows "Indexing…" status
  - [x] On error: display `result.error` message inline
  - [x] After successful upload: call `router.refresh()` to reload file list

- [x] Task 6: `KbFileList` client component stub (AC: 3)
  - [x] Create `components/kb/kb-file-list.tsx`
  - [x] Accept `files: KbFile[]` prop
  - [x] Render table: filename, upload date, size (formatted), status badge (`pending` = yellow, `ready` = green, `error` = red)
  - [x] For story 3.3 the delete button is added; for now render an empty column placeholder

- [x] Task 7: Navigation link (AC: 1)
  - [x] Add "Knowledge Base" link to `app/(app)/layout.tsx` (added minimal nav with Inbox, Knowledge Base, Settings links)

- [x] Task 8: Tests (AC: 1, 2)
  - [x] Create `app/(app)/knowledge-base/actions.test.ts`
  - [x] Test: valid CSV upload → returns `{ id, filename, status: 'pending' }`
  - [x] Test: invalid mime type → returns `{ error }` without storing
  - [x] Test: file too large → returns `{ error }` without storing
  - [x] Mock Supabase client (storage upload + db insert) with `vi.mock`

## Dev Notes

### Key Architecture Constraints

- **No content stored from emails** (NFR8/FR33) — only KB files (CSV/Excel) are stored
- **KB files encrypted at rest** in Supabase Storage (platform default)
- **RLS at all layers**: `kb_files` table uses `auth.uid() = user_id`; Storage policies use `auth.uid()::text = (storage.foldername(name))[1]` (folder = user_id)
- **No indexing logic in this story** — story 3.2 implements the Edge Function. This story only creates the `kb_files` row with `status = 'pending'`

### DB Schema — `kb_files`

```sql
CREATE TABLE IF NOT EXISTS public.kb_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'ready', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Accepted MIME Types

```typescript
const ACCEPTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',                                           // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
```

### Supabase Storage Path Convention

```
storage bucket: knowledge-base
path format:    {user_id}/{timestamp}-{original_filename}
example:        abc123/1712345678000-prices.csv
```

Using the user_id as the first path segment lets Storage RLS use `(storage.foldername(name))[1]` to scope access.

### Server Action Pattern (follow story 2.4)

```typescript
// app/(app)/knowledge-base/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function uploadKbFileAction(formData: FormData): Promise<{ id: string; filename: string; status: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  // Validate...
  // Upload to storage...
  // Insert to kb_files...
}
```

### KbUploadZone Pattern (follow disconnect-mailbox-button.tsx for useTransition)

```tsx
'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function KbUploadZone() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.set('file', file)
      startTransition(async () => {
        const result = await uploadKbFileAction(formData)
        if ('error' in result) {
          // show error
        } else {
          router.refresh()
        }
      })
    }
  }
  // ...drag-and-drop handlers
}
```

### File Structure to Create/Modify

```
New files:
  supabase/migrations/008_kb_files.sql
  supabase/migrations/009_kb_storage.sql
  app/(app)/knowledge-base/page.tsx
  app/(app)/knowledge-base/actions.ts
  app/(app)/knowledge-base/actions.test.ts
  components/kb/kb-upload-zone.tsx
  components/kb/kb-file-list.tsx

Modify:
  app/(app)/layout.tsx  (or wherever nav links are defined — add KB link)
```

### Navigation

Check `app/(app)/layout.tsx` for existing nav. The settings link is there as reference — add "Knowledge Base" similarly, pointing to `/knowledge-base`.

### Testing Pattern (from story 2.5)

```typescript
// actions.test.ts — vi.mock Supabase, test the action directly
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('uploadKbFileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error for invalid mime type', async () => { ... })
  it('returns error for oversized file', async () => { ... })
  it('uploads valid CSV and inserts kb_files row', async () => { ... })
})
```

### Previous Story Learnings (from 2.5)

- Edge Functions use Deno — add `supabase/functions/**` to `eslint.config.mjs` ignores and `tsconfig.json` exclude if creating any
- Supabase `createClient()` from `@/lib/supabase/server` is the correct import for server actions
- `useTransition` + `startTransition` is the preferred pattern for client-side server action calls
- Always handle both `'error' in result` and success branches
- `router.refresh()` after mutation to trigger RSC re-fetch

### Project Structure Notes

- **App dir**: `app/(app)/knowledge-base/` — follows existing `(app)` route group pattern (settings, inbox, etc.)
- **Components**: `components/kb/` — follows existing `components/shared/`, `components/inbox/` pattern
- **Actions**: co-located in `app/(app)/knowledge-base/actions.ts` — same as `app/(app)/settings/actions.ts`
- **No new lib/ files needed** for this story — embeddings logic is story 3.2

### References

- Architecture file upload pattern: [architecture.md FR24–FR28]
- Storage bucket + RLS: [architecture.md Data Architecture]
- Accepted types + max size: [prd.md NFR Security + Compliance]
- Folder structure: [architecture.md Project Structure lines 425–430]
- Previous action pattern: [app/(app)/settings/actions.ts]
- Previous client component: [components/shared/disconnect-mailbox-button.tsx]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Migration 008: `kb_files` table with RLS (SELECT/INSERT/DELETE per owner), index on `(user_id, created_at DESC)`
- Migration 009: `knowledge-base` storage bucket (private, 10 MB limit, CSV/Excel only) with Storage RLS scoped by user_id folder
- Server action `uploadKbFileAction`: validates mime type + size, uploads to Storage, inserts `kb_files` row; best-effort cleanup on DB insert failure
- Page RSC `app/(app)/knowledge-base/page.tsx`: reads `kb_files` for user, passes to client components
- `KbUploadZone`: drag-and-drop + click-to-browse, client-side validation, `useTransition` for non-blocking upload, per-file error display
- `KbFileList`: table with filename, date, size (formatted), status badge (yellow/green/red); delete column placeholder for story 3.4
- `app/(app)/layout.tsx`: added nav bar with Inbox / Knowledge Base / Settings links (no nav existed before)
- Fixed lint error in `disconnect-mailbox-button.tsx`: `catch (e)` → `catch` (unused variable)
- 5 tests all pass; full suite 59/59 green; typecheck clean; lint clean

### File List

- `supabase/migrations/008_kb_files.sql` (new)
- `supabase/migrations/009_kb_storage.sql` (new)
- `app/(app)/knowledge-base/actions.ts` (new)
- `app/(app)/knowledge-base/actions.test.ts` (new)
- `app/(app)/knowledge-base/page.tsx` (new)
- `components/kb/kb-upload-zone.tsx` (new)
- `components/kb/kb-file-list.tsx` (new)
- `app/(app)/layout.tsx` (modified — added nav)
- `components/shared/disconnect-mailbox-button.tsx` (modified — fixed unused catch var)
