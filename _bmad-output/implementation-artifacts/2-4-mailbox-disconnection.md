# Story 2.4: Mailbox Disconnection

Status: review

## Story

As a user,
I want to disconnect a connected mailbox,
so that I can revoke MailAgent's access to my email at any time.

## Acceptance Criteria

1. **Given** a connected mailbox is shown in Settings
   **When** the user clicks "Disconnect" and confirms
   **Then** the credentials/tokens are deleted from Supabase Vault
   **And** the `email_connections` record is deleted from the database
   **And** the user sees a confirmation that the mailbox has been disconnected
   **And** the Settings page refreshes to show the connect button again

2. **Given** the Vault or DB deletion fails
   **When** disconnect is attempted
   **Then** a clear error message is shown and no partial state is left

3. **Given** the email sync job feature (Story 2.5) is not yet implemented
   **When** disconnect runs
   **Then** sync job deactivation is skipped (no-op, noted in code with TODO for 2.5)

---

## Context & Prerequisites

**Stories 2.1, 2.2, and 2.3 must be merged before implementing this story.**

- `email_connections` table — rows with `vault_secret_id` for all three providers (gmail, outlook, imap)
- `create_vault_secret()` RPC wrapper (migration `003_vault_wrapper.sql`) — already exists
- **A new `delete_vault_secret(secret_id uuid)` RPC wrapper is required** — must be created in migration `004_vault_delete_wrapper.sql`
- `app/(app)/settings/actions.ts` — add `disconnectMailboxAction()`
- `app/(app)/settings/page.tsx` — enable the disabled "Disconnect" buttons (already scaffolded with `disabled` placeholder)
- `components/shared/` — add `DisconnectMailboxButton` client component

**Key difference from 2.1/2.2/2.3:** This is a destructive operation. It must:
1. Delete the Vault secret first (using service role)
2. Then delete the `email_connections` row
3. Never leave a dangling `email_connections` row pointing to a deleted Vault secret

---

## Tasks / Subtasks

- [x] Task 1 — Add DB migration `004_vault_delete_wrapper.sql` (AC: #1, #2)
  - [x] Create `supabase/migrations/004_vault_delete_wrapper.sql`
  - [x] Create RPC `public.delete_vault_secret(secret_id uuid) RETURNS void`
  - [x] Calls `vault.delete_secret(secret_id)` internally
  - [x] `SECURITY DEFINER`, `REVOKE FROM PUBLIC`, `GRANT TO service_role` — same pattern as `create_vault_secret`

- [x] Task 2 — Add `disconnectMailboxAction()` Server Action (AC: #1, #2, #3)
  - [x] Add to `app/(app)/settings/actions.ts`
  - [x] Accept param: `{ provider: 'gmail' | 'outlook' | 'imap' }`
  - [x] Authenticate user via `createClient().auth.getUser()`
  - [x] Fetch `email_connections` row for `{ user_id, provider }` to get `vault_secret_id`
  - [x] Return `{ error: 'NOT_FOUND' }` if no connection exists
  - [x] Call `adminClient.rpc('delete_vault_secret', { secret_id: vault_secret_id })`
  - [x] On Vault deletion success: delete `email_connections` row via `adminClient.from('email_connections').delete().match({ user_id, provider })`
  - [x] On Vault deletion failure: return `{ error: 'DISCONNECT_FAILED' }` — do NOT delete DB row
  - [x] On DB deletion failure: return `{ error: 'DISCONNECT_FAILED' }`
  - [x] On success: return `{ success: true }`
  - [x] Add TODO comment: `// TODO(story-2.5): deactivate email sync job for this provider`

- [x] Task 3 — Create `DisconnectMailboxButton` client component (AC: #1, #2)
  - [x] Create `components/shared/disconnect-mailbox-button.tsx` (`'use client'`)
  - [x] Props: `{ provider: 'gmail' | 'outlook' | 'imap' }`
  - [x] Renders a "Disconnect" button; on click shows inline confirmation ("Are you sure? This will remove access to your mailbox.")
  - [x] Uses `useTransition` for pending state, `disabled={isPending}` during request
  - [x] On success: calls `router.refresh()` (from `useRouter`) to reload the server component — no redirect needed
  - [x] On error: shows inline error message ("Failed to disconnect. Please try again.")
  - [x] Use shadcn/ui `Button` with `variant="outline"` and `size="sm"`

- [x] Task 4 — Update Settings UI (AC: #1)
  - [x] Update `app/(app)/settings/page.tsx`:
    - Replace the disabled `<button disabled ...>Disconnect</button>` placeholders for Gmail, Outlook, and IMAP with `<DisconnectMailboxButton provider="gmail" />` etc.
    - Remove the `title="Disconnect available in Story 2.4"` tooltip

- [x] Task 5 — Write unit tests (AC: #1, #2)
  - [x] Extend `app/(app)/settings/actions.test.ts`
  - [x] Mock `createAdminClient` RPC and `.from().delete()`
  - [x] Test: valid provider + vault delete + DB delete → returns `{ success: true }`
  - [x] Test: connection not found in DB → returns `{ error: 'NOT_FOUND' }`, no vault/DB operations
  - [x] Test: vault RPC fails → returns `{ error: 'DISCONNECT_FAILED' }`, DB row NOT deleted
  - [x] Test: DB delete fails after vault success → returns `{ error: 'DISCONNECT_FAILED' }`
  - [x] Test: not authenticated → returns `{ error: 'Not authenticated.' }`

---

## Dev Notes

### New Migration Required — `delete_vault_secret`

There is no existing `delete_vault_secret` RPC. You **must** create it:

```sql
-- supabase/migrations/004_vault_delete_wrapper.sql
CREATE OR REPLACE FUNCTION public.delete_vault_secret(secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  PERFORM vault.delete_secret(secret_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_vault_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_vault_secret(uuid) TO service_role;
```

**Why SECURITY DEFINER?** The `vault` schema is only accessible with elevated permissions. Same reason as `create_vault_secret`.

### Disconnect Operation Order — CRITICAL

Always delete Vault secret **before** the DB row. If Vault deletion fails, abort — do not delete the DB row. A dangling `email_connections` row pointing to a still-existing Vault secret is better than a row pointing to nothing.

```typescript
// 1. Get vault_secret_id from DB (user-scoped client, RLS enforced)
const { data: connection } = await supabase
  .from('email_connections')
  .select('vault_secret_id')
  .match({ user_id: userId, provider })
  .single()

if (!connection) return { error: 'NOT_FOUND' }

// 2. Delete from Vault first (admin client — service role)
const { error: vaultError } = await adminClient.rpc('delete_vault_secret', {
  secret_id: connection.vault_secret_id,
})
if (vaultError) return { error: 'DISCONNECT_FAILED' }

// 3. Only then delete the DB row (admin client for consistent access)
const { error: deleteError } = await adminClient
  .from('email_connections')
  .delete()
  .match({ user_id: userId, provider })

if (deleteError) return { error: 'DISCONNECT_FAILED' }

return { success: true }
```

### Client Component — `router.refresh()` Pattern

After a successful disconnect, the Settings page (a Server Component) must re-fetch `email_connections`. Use `useRouter().refresh()` to trigger this without a full page reload:

```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()
// after success:
router.refresh()
```

This re-runs the Server Component's data fetching, updating the UI to show the connect button.

### Confirmation UX — Inline, No Modal

No modal/dialog needed. Inline two-step confirmation:
1. First click: show confirmation state ("Sure?" + Cancel/Confirm buttons)
2. Second click (Confirm): fires the Server Action

Use `useState` for the confirmation step:

```typescript
const [confirming, setConfirming] = useState(false)
// First click → setConfirming(true)
// Cancel → setConfirming(false)
// Confirm → startTransition(() => disconnectMailboxAction({ provider }))
```

### Supabase Client Usage

- `createClient()` — for `auth.getUser()` (user session check)
- `createAdminClient()` — for all Vault and DB operations (service role required for Vault)
- Never use `createClient()` for Vault RPC calls — it will fail due to permission restrictions

### Architecture Compliance

- Server Action for all mutations ✅
- `createAdminClient()` from `@/lib/supabase/admin` ✅
- `createClient()` from `@/lib/supabase/server` ✅
- Vault operations via RPC wrapper only — never `vault.*` schema directly ✅
- `useTransition` + `router.refresh()` in client component ✅
- shadcn/ui `Button` consistent with project ✅
- Tests: `vi.resetModules()` + `vi.clearAllMocks()` in `beforeEach`, dynamic `import()` after mocking ✅

### Sync Job (Story 2.5) — Out of Scope

The epic spec mentions "deactivate the email sync job". Story 2.5 (automatic email sync) is not yet implemented — there are no sync jobs in the DB. Add a `TODO` comment in the action but do not implement sync job logic.

### Files to Create / Modify

| Action | File |
|--------|------|
| Create | `supabase/migrations/004_vault_delete_wrapper.sql` |
| Modify | `app/(app)/settings/actions.ts` — add `disconnectMailboxAction()` |
| Create | `components/shared/disconnect-mailbox-button.tsx` |
| Modify | `app/(app)/settings/page.tsx` — replace disabled buttons |
| Modify | `app/(app)/settings/actions.test.ts` — add disconnect tests |

### Previous Story Patterns to Follow

- Server Actions always return `{ error: string }` or `{ success: true }` — never throw to client
- `createAdminClient()` from `@/lib/supabase/admin`
- `createClient()` from `@/lib/supabase/server`
- `useTransition` in client components for pending state
- shadcn/ui `Button` with `disabled={isPending}` during loading
- Tests: `vi.resetModules()` + `vi.clearAllMocks()` in `beforeEach`, dynamic `import()` after mocking

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Created `004_vault_delete_wrapper.sql` migration with `public.delete_vault_secret(uuid)` RPC — SECURITY DEFINER, service_role only
- Added `disconnectMailboxAction()` server action: vault deleted first, then DB row; partial state (dangling row) prevented by abort-on-vault-failure
- Created `DisconnectMailboxButton` client component with inline two-step confirmation, `useTransition`, and `router.refresh()` on success
- Replaced all three disabled Disconnect button placeholders in Settings page
- 5 new unit tests covering all AC scenarios: success, NOT_FOUND, vault failure (DB row preserved), DB failure, unauthenticated
- All 38 tests pass; typecheck and lint clean

### File List

- `supabase/migrations/004_vault_delete_wrapper.sql` (created)
- `app/(app)/settings/actions.ts` (modified — added `disconnectMailboxAction`)
- `components/shared/disconnect-mailbox-button.tsx` (created)
- `app/(app)/settings/page.tsx` (modified — replaced disabled buttons)
- `app/(app)/settings/actions.test.ts` (modified — added disconnect tests)

### Change Log

- 2026-03-29: Implemented story 2.4 — mailbox disconnection (migration, server action, client component, settings UI, tests)
