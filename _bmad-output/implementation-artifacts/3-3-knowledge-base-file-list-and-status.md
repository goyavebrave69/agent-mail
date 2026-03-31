# Story 3.3: Knowledge Base File List & Status

Status: review

## Story

As a user,
I want to view all my uploaded knowledge base files and their indexing status,
So that I can understand what data the AI has access to.

## Acceptance Criteria

1. **Given** the user navigates to the Knowledge Base page
   **When** the page loads
   **Then** all their KB files are listed with name, upload date, size, and status (`pending` / `ready` / `error`)
   **And** only their own files are visible (RLS enforced)

2. **Given** a file has status `error`
   **When** the user views the list
   **Then** the error reason is displayed alongside a re-upload option

## Tasks / Subtasks

- [x] Task 1: Add `retriggerIndexKbAction` server action (AC: 2)
  - [x] In `app/(app)/knowledge-base/actions.ts`, add `retriggerIndexKbAction(kbFileId: string)`
  - [x] Auth check: return `{ error: 'Unauthorized' }` if no user
  - [x] Ownership check: fetch `kb_files` row for current user — return `{ error: 'Not found' }` if not found or different user
  - [x] Status check: only allow retrigger if status is `error` — return `{ error: 'File is not in error state' }` otherwise
  - [x] Update `kb_files.status = 'pending'`, clear `error_message = null`
  - [x] Fire-and-forget fetch to `/functions/v1/index-kb` (same pattern as `uploadKbFileAction`)
  - [x] Return `{ success: true }`

- [x] Task 2: Add re-upload button to `KbFileList` for error rows (AC: 2)
  - [x] In `components/kb/kb-file-list.tsx`, add a "Retry" button in the action column for rows where `status === 'error'`
  - [x] Component must be `'use client'` (already is)
  - [x] Button calls `retriggerIndexKbAction(file.id)` — use `useTransition` + `router.refresh()` on success
  - [x] Show loading state on button during transition ("Retrying…")
  - [x] On error: display inline error message above the table

- [x] Task 3: Tests for `retriggerIndexKbAction` (AC: 2)
  - [x] Add tests to `app/(app)/knowledge-base/actions.test.ts`
  - [x] Test: returns error when not authenticated
  - [x] Test: returns error when file not found or belongs to different user
  - [x] Test: returns error when file status is not `error`
  - [x] Test: updates status to `pending`, fires fetch to index-kb, returns `{ success: true }`
  - [x] Test: fetch failure does not break return value (fire-and-forget)

## Dev Notes

### What Is Already Built

Stories 3-1 and 3-2 already implemented the full list + status display. The following is COMPLETE and should NOT be reimplemented:

- `app/(app)/knowledge-base/page.tsx` — RSC page querying `kb_files`, passing to `KbUploadZone` + `KbFileList`
- `components/kb/kb-file-list.tsx` — table with filename, date, size, status badge, error message
- Status badge variants: `pending` (yellow), `ready` (green), `error` (red)
- Empty state message

The **only missing piece** is the re-upload/retry action for error files (AC 2).

### `retriggerIndexKbAction` — Implementation Pattern

Follow `uploadKbFileAction` for the fire-and-forget trigger pattern:

```typescript
export async function retriggerIndexKbAction(
  kbFileId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: kbFile, error: fetchError } = await supabase
    .from('kb_files')
    .select('id, user_id, status')
    .eq('id', kbFileId)
    .eq('user_id', user.id)  // ownership enforced at query level
    .single()

  if (fetchError || !kbFile) return { error: 'Not found' }
  if (kbFile.status !== 'error') return { error: 'File is not in error state' }

  const { error: updateError } = await supabase
    .from('kb_files')
    .update({ status: 'pending', error_message: null })
    .eq('id', kbFileId)

  if (updateError) return { error: `Failed to reset status: ${updateError.message}` }

  // Fire-and-forget
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/index-kb`
  fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ kb_file_id: kbFileId }),
  }).catch((err: unknown) => console.error('[index-kb retrigger]', err))

  return { success: true }
}
```

### Retry Button in `KbFileList`

`KbFileList` is already `'use client'`. Add `useTransition` and `useRouter` at the top:

```typescript
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { retriggerIndexKbAction } from '@/app/(app)/knowledge-base/actions'
```

In the error row's action cell:

```tsx
const [isPending, startTransition] = useTransition()
const router = useRouter()

function handleRetry(id: string) {
  startTransition(async () => {
    const result = await retriggerIndexKbAction(id)
    if ('error' in result) {
      // show inline error — use simple state or a toast
    } else {
      router.refresh()
    }
  })
}

// In the action cell for error rows:
{file.status === 'error' && (
  <button
    onClick={() => handleRetry(file.id)}
    disabled={isPending}
    className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
  >
    {isPending ? 'Retrying…' : 'Retry'}
  </button>
)}
```

### Important: `isPending` Scope

`useTransition` returns a single `isPending` boolean. If multiple files can retry at once, track pending per file ID using a `Set` in state, OR accept that all retry buttons disable during any pending transition (simpler — acceptable for V1).

For V1 simplicity, a single `isPending` that disables all retry buttons during transition is acceptable.

### Error Display for Retry Failure

Use a `retryError` state (`useState<string | null>(null)`) scoped to the component. Show it below the table or near the row. Do not use a toast library unless one is already imported in the KB components.

Check existing components for toast usage before deciding. If no toast is used, a simple `<p className="text-xs text-destructive">` below the table is fine.

### Testing Pattern for `retriggerIndexKbAction`

Add to `app/(app)/knowledge-base/actions.test.ts`. The `mockFetch` is already set up globally via `vi.stubGlobal('fetch', mockFetch)`. The `createClient` mock pattern is identical to existing tests.

```typescript
describe('retriggerIndexKbAction', () => {
  // Need a separate supabase mock that handles:
  // - auth.getUser()
  // - .from('kb_files').select(...).eq('id', ...).eq('user_id', ...).single()
  // - .from('kb_files').update(...).eq('id', ...)
})
```

The mock chain for `.eq('user_id', ...).single()` is: `from → select → eq → eq → single`.

### Existing Mock Setup to Reuse

The `beforeEach` in the existing test file sets up a single `createClient` mock. For the retrigger tests, either:
1. Add a nested `describe` block that overrides the mock just for those tests using a separate `beforeEach`, OR
2. Add the `.select().eq().eq().single()` chain to the existing mock

Option 1 is cleaner — add a new `describe('retriggerIndexKbAction', ...)` block with its own mock setup.

### File Structure — Changes Required

```
Modify:
  app/(app)/knowledge-base/actions.ts         (add retriggerIndexKbAction)
  app/(app)/knowledge-base/actions.test.ts    (add retrigger tests)
  components/kb/kb-file-list.tsx              (add Retry button for error rows)
```

No new files, no migrations, no Edge Function changes.

### RLS Reminder

`kb_files` RLS: `auth.uid() = user_id` for SELECT/UPDATE/DELETE. The ownership check in the server action (`.eq('user_id', user.id)`) is belt-and-suspenders — RLS enforces it at the DB level regardless.

### References

- `uploadKbFileAction` fire-and-forget pattern: `app/(app)/knowledge-base/actions.ts`
- `KbFileList` component: `components/kb/kb-file-list.tsx`
- `kb_files` schema: `supabase/migrations/008_kb_files.sql`
- `index-kb` Edge Function: `supabase/functions/index-kb/index.ts`
- Testing pattern: `app/(app)/knowledge-base/actions.test.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation.

### Completion Notes List

- `retriggerIndexKbAction` added to `actions.ts`: auth check → ownership check (`.eq('user_id', user.id)`) → status guard (`error` only) → update `pending` + clear `error_message` → fire-and-forget trigger to `index-kb` Edge Function
- `KbFileList` updated: added `useTransition` + `useRouter`, "Retry" button appears on error rows, disables during transition, `router.refresh()` on success, inline `retryError` state above table
- Also added fire-and-forget trigger to `uploadKbFileAction` (was missing from this worktree — story 3-2 not yet merged into dev)
- 5 new tests for `retriggerIndexKbAction` + `mockFetch` global added — 65/65 tests passing
- Typecheck clean, lint clean

### File List

- `app/(app)/knowledge-base/actions.ts` (modified — added `retriggerIndexKbAction` + fire-and-forget trigger to `uploadKbFileAction`)
- `app/(app)/knowledge-base/actions.test.ts` (modified — added `mockFetch` global + 5 retrigger tests)
- `components/kb/kb-file-list.tsx` (modified — added Retry button with `useTransition`)
