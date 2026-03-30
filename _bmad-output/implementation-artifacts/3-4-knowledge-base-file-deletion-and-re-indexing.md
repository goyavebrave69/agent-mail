# Story 3.4: Knowledge Base File Deletion & Re-indexing

## Story

**As a** user,
**I want** to delete a knowledge base file,
**So that** I can remove outdated data and keep the AI grounded in current information.

---

## Status: ready-for-dev

---

## Acceptance Criteria

**Given** the user clicks "Delete" on a KB file and confirms
**When** the action executes
**Then** the file is removed from Supabase Storage
**And** the `kb_files` record is deleted from the database
**And** all associated embeddings for that file are deleted from the `embeddings` table
**And** the knowledge base file list refreshes to reflect the removal

**Given** the deletion fails at any step
**When** an error occurs
**Then** the user is notified with an error message
**And** the file remains in the list — no partial deletion

**Given** the user clicks "Delete" but does not confirm
**When** they cancel the confirmation
**Then** nothing happens and the file remains in the list

---

## Technical Requirements

### 1. Server Action: `deleteKbFileAction`

Add to `app/(app)/knowledge-base/actions.ts`:

```typescript
export async function deleteKbFileAction(
  kbFileId: string
): Promise<{ success: true } | { error: string }>
```

**Execution order (abort on any error — no partial deletion):**

1. Auth check via `supabase.auth.getUser()` → return `{ error: "Unauthorized" }` if no user
2. Fetch `kb_files` record — `select("id, user_id, storage_path")` + `.eq("id", kbFileId).eq("user_id", user.id).single()` → return `{ error: "Not found" }` if missing
3. Delete from Storage: `supabase.storage.from("knowledge-base").remove([storagePath])` → return `{ error: "..." }` if `error`
4. Delete embeddings: `supabase.from("embeddings").delete().eq("kb_file_id", kbFileId).eq("user_id", user.id)` — if error, log it but **do not abort** (embeddings are derived data, not source of truth)
5. Delete `kb_files` record: `.delete().eq("id", kbFileId).eq("user_id", user.id).select("id")` → return `{ error: "..." }` if error or 0 rows deleted
6. `revalidatePath("/knowledge-base")`
7. Return `{ success: true }`

**Why storage first?** If the DB delete succeeds but storage fails, the file becomes an orphan. Doing storage first means a failure leaves the DB record intact — the user can retry.

### 2. UI: Delete button in `components/kb/kb-file-list.tsx`

- Replace the `{/* Delete button added in story 3.4 */}` placeholder
- Delete button visible for **all** files (not just errors)
- **Inline confirmation** — no modal:
  - First click → show "Sure? [Yes] [No]" in the same cell
  - Track `confirmingId: string | null` with `useState`
  - "No" or clicking elsewhere → reset `confirmingId` to null
  - "Yes" → call `deleteKbFileAction(file.id)`, then `router.refresh()` on success
- **Loading state:** use a separate `isDeletingId: string | null` state so it doesn't interfere with the existing retry `isPending`
- **Error:** reuse the existing `retryError` pattern — show error above the table, or add a separate `deleteError` state

### 3. No new migration needed

- `kb_files_delete_owner` RLS policy already exists (migration 008)
- `kb_storage_delete_owner` Storage RLS policy already exists (migration 009)
- `embeddings` table has `ON DELETE CASCADE` on `kb_file_id` (migration 010) — but we still delete explicitly for safety and to avoid relying solely on cascade

---

## File Locations

| File | Action |
|------|--------|
| `app/(app)/knowledge-base/actions.ts` | Add `deleteKbFileAction` |
| `components/kb/kb-file-list.tsx` | Add Delete button + inline confirmation |

No new files needed.

---

## Dev Guardrails

- **Supabase client:** always `createClient` from `@/lib/supabase/server` — never instantiate directly
- **RLS + explicit user scope:** always add `.eq("user_id", user.id)` — learned in story 3.3: RLS alone can return empty results silently when policies are missing; belt-and-suspenders is safer
- **revalidatePath:** call before `return { success: true }` — required alongside `router.refresh()` to bypass Next.js RSC cache (story 3.3 lesson)
- **Return shape:** `{ error: string }` on failure, `{ success: true }` on success — consistent with all existing actions in this file
- **No partial deletion:** storage error → abort, don't delete DB record
- **isPending isolation:** don't reuse the retry `useTransition` — use `isDeletingId: string | null` to track which row is being deleted independently
- **`.select("id")` after `.delete()`:** add to detect 0-row matches (Supabase returns no error for deletes that match 0 rows)

---

## Tests

Add a `describe("deleteKbFileAction", ...)` block to `app/(app)/knowledge-base/actions.test.ts`, following the exact same mock pattern as `retriggerIndexKbAction`.

Mock shape needed for `deleteKbFileAction`:
```typescript
{
  auth: { getUser: mockGetUser },
  storage: {
    from: vi.fn().mockReturnValue({ remove: mockRemove }),
  },
  from: vi.fn((table: string) => {
    if (table === "embeddings") return { delete: mockDeleteEmbeddings }
    if (table === "kb_files") return {
      select: vi.fn() /* for fetch */,
      delete: mockDeleteKbFile,
    }
  }),
}
```

**Required test cases:**
1. Unauthorized → `{ error: "Unauthorized" }`
2. File not found / wrong user → `{ error: "Not found" }`
3. Storage removal fails → returns error, does NOT call kb_files delete
4. Happy path → storage removed, embeddings deleted, kb_files deleted, returns `{ success: true }`
5. Embeddings delete fails → logs error but still deletes kb_files and returns `{ success: true }` (non-blocking)
6. kb_files delete returns 0 rows → returns `{ error: "..." }`

---

## Context from Previous Stories

**From story 3.3 (direct lessons):**
- The RLS UPDATE policy was missing and Supabase returned no error — just empty results. Always add `.select()` after mutations to detect 0-row matches.
- `revalidatePath("/knowledge-base")` is required in the Server Action — `router.refresh()` alone doesn't bypass Next.js cache for RSC data.
- `useTransition` `isPending` is shared — use per-action state for delete to avoid UI conflicts with retry.

**From story 3.2 (embeddings):**
- `embeddings` table has `kb_file_id` FK with `ON DELETE CASCADE` — but explicit deletion is still preferred for clarity and auditability.
- The embeddings table uses `user_id` RLS scoping — always include `.eq("user_id", user.id)` on embeddings operations.

**From story 3.1 (upload):**
- Storage path format: `{user_id}/{timestamp}-{filename}` — stored in `kb_files.storage_path`, use it directly for deletion.
- Storage bucket: `"knowledge-base"`.
