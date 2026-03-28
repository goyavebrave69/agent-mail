# Story 1.4: Account Deletion & GDPR Data Cleanup

Status: done

## Story

As a user,
I want to permanently delete my account and all my associated data,
so that I have full control over my personal data in compliance with GDPR.

## Acceptance Criteria

1. **Given** the user navigates to account settings and requests account deletion
   **When** they confirm the deletion (with a confirmation prompt)
   **Then** their Supabase Auth user is deleted
   **And** all their data (KB files, drafts metadata, email connections, preferences) is deleted from the database
   **And** any files in Supabase Storage are deleted
   **And** the user is logged out and redirected to `/`

2. **Given** the deletion process fails partially
   **When** an error occurs
   **Then** the user is notified and no silent partial deletion occurs

## Tasks / Subtasks

- [x] Task 1 — Create `(app)/settings/` route with account deletion UI (AC: #1)
  - [x] Create `app/(app)/layout.tsx` — auth-protected layout (server-side `getUser` check → redirect `/login`; minimal wrapper, no full nav yet — Epic 6 scope)
  - [x] Create `app/(app)/settings/page.tsx` — settings page with a "Delete Account" section
  - [x] Add a `DeleteAccountButton` client component at `components/shared/delete-account-button.tsx`:
    - `'use client'` with `useTransition`
    - Opens a confirmation dialog (shadcn/ui `AlertDialog`) before calling the Server Action
    - Confirmation prompt text: "This action is permanent and cannot be undone. All your data will be deleted."
    - Shows loading state while pending; shows error message if action returns `{ error: string }`

- [x] Task 2 — Create `deleteAccountAction` Server Action (AC: #1, #2)
  - [x] Create `app/(app)/settings/actions.ts` with `deleteAccountAction()` Server Action
  - [x] The action must use the **Supabase Admin client** (service role) to delete the auth user — regular client cannot call `auth.admin.deleteUser()`
  - [x] Implementation steps in order:
    1. Get current user via `createClient()` (server client) → `supabase.auth.getUser()`
    2. If no user → return `{ error: "Not authenticated." }`
    3. Delete auth user via Admin client: `createAdminClient().auth.admin.deleteUser(userId)`
       - Cascade: `public.users` row is auto-deleted via `ON DELETE CASCADE` (see migration `001_init_schema.sql`)
       - Future tables (email_connections, kb_files, drafts) will also cascade when created in later epics
    4. On Admin API error → return `{ error: "Unable to delete account. Please try again." }` (do NOT partially delete)
    5. On success → `redirect("/")`
  - [x] `SUPABASE_SECRET_KEY` (already in `.env.example`) is the service role key — aligned with existing project convention

- [x] Task 3 — Create `createAdminClient` helper (AC: #1)
  - [x] Create `lib/supabase/admin.ts` with `createAdminClient()` using `SUPABASE_SECRET_KEY`
  - [x] This file must ONLY be imported from Server Actions or Route Handlers — never from Client Components

- [x] Task 4 — Write unit tests (AC: #1, #2)
  - [x] Create `app/(app)/settings/actions.test.ts` (Vitest)
  - [x] Test: unauthenticated call returns `{ error: "Not authenticated." }`
  - [x] Test: successful deletion calls `auth.admin.deleteUser` with correct userId and triggers redirect
  - [x] Test: Admin API error returns `{ error: "Unable to delete account..." }` without redirecting
  - [x] Mock both `createClient` (from `lib/supabase/server`) and `createAdminClient` (from `lib/supabase/admin`)
  - [x] Follow the same mock/`beforeEach` pattern as `app/(auth)/login/actions.test.ts`

### Review Findings

- [x] [Review][Patch] Guard against thrown deletion failures in `deleteAccountAction` [app/(app)/settings/actions.ts:23]

## Dev Notes

### Cascade Delete Architecture — What's Covered

The `public.users` table has `REFERENCES auth.users(id) ON DELETE CASCADE`. Deleting the `auth.users` row automatically deletes the `public.users` profile row. **No explicit DELETE SQL needed for `public.users`.**

In V1 (Epic 1), no other tables exist yet. The cascade is already correct for the current schema. Future tables created in later epics (Epic 2: `email_connections`, Epic 3: `kb_files`, Epic 4: drafts) **must also use `ON DELETE CASCADE` referencing `public.users(id)` or `auth.users(id)` — this is a forward constraint established by this story.**

### Why Admin Client Is Required

`supabase.auth.admin.deleteUser()` requires the **service role key**, which bypasses RLS. The regular `createClient()` (server client) uses the publishable/anon key and cannot call Admin API methods.

The admin client must:
- Only be instantiated server-side (Server Actions, Route Handlers)
- Use `autoRefreshToken: false, persistSession: false` (stateless — no cookie handling)
- Never be imported in Client Components or exported from a file that could be tree-shaken into the client bundle

### `SUPABASE_SERVICE_ROLE_KEY` — Security

This key must:
- Be added to `.env.local` locally (get from Supabase dashboard → Project Settings → API)
- Be added to Vercel environment variables (server-only, not `NEXT_PUBLIC_`)
- NEVER be prefixed with `NEXT_PUBLIC_` — doing so would expose it to the browser

### `(app)` Route Group — Minimal Layout for Now

The architecture specifies `app/(app)/layout.tsx` as the "app shell (sidebar, nav)" but the sidebar/nav is Epic 6 scope. For this story, create a minimal auth-protected layout — just a server-side `getUser` check + `redirect('/login')` if unauthenticated. Same pattern as `app/(onboarding)/layout.tsx`.

The settings page itself should be minimal: a heading "Account Settings" and a "Danger Zone" section with the delete button.

### Supabase Storage — V1 Scope

The AC mentions "files in Supabase Storage are deleted." In V1 (Epic 1), Supabase Storage is not yet configured — KB file uploads belong to Epic 3. **No storage deletion is needed in this story.** Add a comment in the action noting this is covered when Epic 3 is implemented.

### Supabase Vault — V1 Scope

OAuth tokens in Vault are Epic 2 scope. No Vault cleanup needed in this story.

### Redirect After Deletion

After successful deletion, redirect to `/` (root). The middleware in `proxy.ts` will handle redirecting unauthenticated users from protected routes — the session is already invalidated by `deleteUser`.

### What This Story Does NOT Do

- Does NOT implement email address change
- Does NOT implement password change / forgot password
- Does NOT implement the full settings UI (OAuth connections, preferences — Epic 2/6)
- Does NOT delete Supabase Storage files (Epic 3 prerequisite)
- Does NOT delete Vault secrets (Epic 2 prerequisite)
- Does NOT add a 30-day grace period or soft-delete — hard delete only in V1

### Patterns from Previous Stories

- Server Action return type: `Promise<{ error: string } | void>` (same as `loginAction`, `logoutAction`)
- `useTransition` pattern in Client Components: same as `LoginForm`, `LogoutButton`
- Auth check in layout: `const { data, error } = await supabase.auth.getUser(); if (error || !data.user) redirect('/login')` — same as `(onboarding)/layout.tsx`
- shadcn/ui `AlertDialog` for the confirmation prompt — use `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` from `@/components/ui/alert-dialog`

### Project Structure Notes

- `app/(app)/layout.tsx` — new auth-protected app shell (minimal for now)
- `app/(app)/settings/page.tsx` — settings page
- `app/(app)/settings/actions.ts` — `deleteAccountAction` co-located Server Action
- `app/(app)/settings/actions.test.ts` — unit tests
- `lib/supabase/admin.ts` — new Admin client helper (server-side only)
- `components/shared/delete-account-button.tsx` — confirmation dialog + action call

### References

- Story requirements: [epics.md — Story 1.4]
- Cascade setup: [supabase/migrations/001_init_schema.sql]
- Auth check pattern: [app/(onboarding)/layout.tsx]
- Server Action pattern: [app/(auth)/login/actions.ts], [app/(auth)/logout/actions.ts]
- `useTransition` pattern: [components/shared/logout-button.tsx]
- AlertDialog: shadcn/ui docs (components/ui/alert-dialog)
- Admin API: Supabase docs — `auth.admin.deleteUser()`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- All 4 tasks completed. TypeScript strict check passes. 16/16 tests pass (3 new + 13 pre-existing, zero regressions).
- `SUPABASE_SECRET_KEY` (already in `.env.example`) utilisé comme service role key — aligné sur la convention existante du projet.
- `lib/supabase/admin.ts` créé avec `autoRefreshToken: false, persistSession: false` — client stateless sécurisé.
- shadcn/ui `AlertDialog` installé via `npx shadcn@latest add alert-dialog`.
- `app/(app)/layout.tsx` suit le même pattern d'auth check que `(onboarding)/layout.tsx`.
- L'action inclut des commentaires documentant que Storage (Epic 3) et Vault (Epic 2) seront couverts dans leurs epics respectifs.

### File List

- `app/(app)/layout.tsx` — new: auth-protected app route group layout
- `app/(app)/settings/page.tsx` — new: settings page with Danger Zone section
- `app/(app)/settings/actions.ts` — new: `deleteAccountAction` Server Action
- `app/(app)/settings/actions.test.ts` — new: 3 tests unitaires
- `lib/supabase/admin.ts` — new: `createAdminClient` helper (service role, server-side only)
- `components/shared/delete-account-button.tsx` — new: confirmation AlertDialog + Server Action call
- `components/ui/alert-dialog.tsx` — new: shadcn/ui AlertDialog component
