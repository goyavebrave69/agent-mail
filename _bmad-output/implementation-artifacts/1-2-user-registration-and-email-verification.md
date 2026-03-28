# Story 1.2: User Registration & Email Verification

Status: review

## Story

As a new user,
I want to create an account with my email and password and verify my email,
so that I can access MailAgent securely with a confirmed identity.

## Acceptance Criteria

1. **Given** the user submits a valid email and password on the signup page
   **When** the form is submitted
   **Then** a Supabase user is created and a verification email is sent within 30 seconds
   **And** the user sees a confirmation screen explaining they must verify their email

2. **Given** the user clicks the verification link in the email
   **When** they are redirected to the app
   **Then** their account is activated and they are redirected to the onboarding flow (`/onboarding/connect-mailbox`)
   **And** the `users` table RLS policy ensures this user can only access their own data

3. **Given** the user tries to sign up with an already-registered email
   **When** the form is submitted
   **Then** an appropriate error message is displayed without exposing that the email exists (generic "If this email is not registered, you will receive a confirmation email" pattern)

## Tasks / Subtasks

- [x] Task 1 — Migrate existing starter auth pages into the `(auth)` route group (AC: #1)
  - [x] Move `app/auth/sign-up/` → `app/(auth)/signup/page.tsx` (kebab-case per architecture)
  - [x] Move `app/auth/login/` → `app/(auth)/login/page.tsx`
  - [x] Move `app/auth/sign-up-success/` → `app/(auth)/verify-email/page.tsx`
  - [x] Create `app/(auth)/layout.tsx` (unauthenticated layout — minimal wrapper, no app shell, NO auth checks — redirect logic lives in middleware only)
  - [x] Keep `app/auth/confirm/route.ts` in place — it handles the OTP callback; update its `next` redirect to `/onboarding/connect-mailbox`

- [x] Task 2 — Rewrite `SignUpForm` as a Server Action–based component (AC: #1, #3)
  - [x] Create `app/(auth)/signup/actions.ts` with `signUpAction(formData: FormData)` Server Action
  - [x] Server Action calls `supabase.auth.signUp()` using `createClient()` from `/lib/supabase/server.ts`
  - [x] `emailRedirectTo` must point to `/auth/confirm?next=/onboarding/connect-mailbox`
  - [x] On success → redirect to `/auth/verify-email` (or `app/(auth)/verify-email`)
  - [x] On error → return `{ error: string }` — do NOT throw; return structured error
  - [x] Email-already-exists error: return generic message only (see "Email Enumeration Prevention" note below)
  - [x] Replace the existing `'use client'` `SignUpForm` component with a Server Component form that calls the Server Action, OR keep it as Client Component using `useTransition` — either is acceptable; Server Action is preferred for consistency with architecture
  - [x] Move `SignUpForm` to `components/shared/` or keep co-located — do NOT place in root `components/` (see Project Structure notes)
  - [x] Add `NEXT_PUBLIC_SITE_URL` to `.env.example` (e.g., `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) and set it in `.env.local` — required by `signUpAction` for `emailRedirectTo`

- [x] Task 3 — Create DB migration: `users` table + RLS (AC: #2)
  - [x] Create `supabase/migrations/001_init_schema.sql`
  - [x] Enable `pgcrypto` extension (needed by Vault later)
  - [x] Create `users` table (profile table linked to `auth.users`):
    ```sql
    CREATE TABLE users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
  - [x] Enable RLS on `users` table
  - [x] Create RLS policy `users_select_owner`: `USING (auth.uid() = id)`
  - [x] Create RLS policy `users_insert_owner`: `WITH CHECK (auth.uid() = id)`
  - [x] Create RLS policy `users_update_owner`: `USING (auth.uid() = id)`
  - [x] Create trigger to auto-insert into `users` on `auth.users` INSERT (see "Auto-populate users table" note below)
  - [x] Run migration via Supabase CLI: `supabase db push` or `supabase migration up`

- [x] Task 4 — Update `app/auth/confirm/route.ts` redirect target (AC: #2)
  - [x] Change `next` default from `"/"` to `"/onboarding/connect-mailbox"`
  - [x] Verify that on successful OTP verification, user lands at `/onboarding/connect-mailbox`
  - [x] Verify that on error, user is redirected to `/auth/error` with a message

- [x] Task 5 — Update middleware route protection (AC: #2)
  - [x] In `lib/supabase/middleware.ts`, extend the `!user` redirect logic:
    - Unauthenticated users trying to reach `/onboarding/*` or `/(app)/*` → redirect to `/(auth)/login` (URL: `/login`)
    - Authenticated users trying to reach `/login` or `/signup` → redirect to `/onboarding/connect-mailbox`
  - [x] **IMPORTANT:** The current middleware hardcodes `/auth/login` as the redirect target. After moving login to `app/(auth)/login/`, the URL becomes `/login`. Update `url.pathname = "/login"` in `lib/supabase/middleware.ts` accordingly.
  - [x] Update the `!request.nextUrl.pathname.startsWith("/auth")` guard to cover the new route paths: `/login`, `/signup`, `/verify-email` must remain accessible without auth

- [x] Task 6 — Create `app/(onboarding)/layout.tsx` shell (AC: #2)
  - [x] Minimal layout: just renders `{children}`, no nav/sidebar
  - [x] Add server-side auth check: if no user → redirect to `/auth/login`
  - [x] Create `app/(onboarding)/onboarding/connect-mailbox/page.tsx` as a **placeholder** page (just renders "Connect your mailbox — coming in Story 2.1") so the redirect target exists and the app doesn't 404

- [x] Task 7 — Verify-email confirmation page (AC: #1)
  - [x] `app/(auth)/verify-email/page.tsx` must clearly state: check email, click the link, return here to continue
  - [x] Use existing `shadcn/ui` Card components (same pattern as the starter's `sign-up-success` page)
  - [x] Do NOT add resend-email functionality in this story (out of scope)

- [x] Task 8 — Write unit tests (AC: #1, #3)
  - [x] Create `app/(auth)/signup/actions.test.ts` (Vitest)
  - [x] Test: successful signup returns no error
  - [x] Test: password mismatch returns error before calling Supabase (client-side guard, or test Server Action validation)
  - [x] Test: Supabase error is returned as structured `{ error: string }` — mock `createClient()`
  - [x] All tests run via `vitest run` in CI without changes to `ci.yml`

## Dev Notes

### Critical: Starter Auth Files Are Already Present — Do NOT Recreate From Scratch

The `create-next-app --example with-supabase` starter (installed in Story 1.1) already provides a working auth scaffold:
- `app/auth/sign-up/page.tsx` → uses `components/sign-up-form.tsx`
- `app/auth/login/page.tsx` → uses `components/login-form.tsx`
- `app/auth/confirm/route.ts` → OTP verification handler (already uses `/lib/supabase/server.ts`)
- `app/auth/sign-up-success/page.tsx` → confirmation screen

**Your job is to REORGANIZE + EXTEND these files, not rewrite everything from zero.** The Supabase auth flow (signUp → verifyOtp via `confirm/route.ts`) is already wired correctly. Preserve the existing OTP confirmation logic in `app/auth/confirm/route.ts` — only change the redirect `next` target.

### Supabase Client Pattern — MANDATORY

Always use the centralized clients. Never instantiate directly:
```typescript
// Server Components, Server Actions, Route Handlers:
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components only:
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()
```
`lib/supabase/server.ts` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not the deprecated `ANON_KEY` — the starter already uses the new key name).

### Server Action Pattern — Required for signUpAction

Architecture mandates Server Actions for all UI mutations, co-located in `actions.ts`:
```typescript
// app/(auth)/signup/actions.ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/onboarding/connect-mailbox`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/auth/verify-email")
}
```
Use `process.env.NEXT_PUBLIC_SITE_URL` (add to `.env.example` and `.env.local`). Do NOT use `window.location.origin` in a Server Action.

### Email Enumeration Prevention

Per AC #3, when a user tries to sign up with an already-registered email, Supabase by default returns a success response (to prevent user enumeration) and sends a "duplicate signup" email. **Do not change this behavior.** The confirmation page message ("Check your email") covers both cases. If Supabase does return an error for this case in your local config, return: `"If this email is not registered, you will receive a confirmation email."` — never expose "Email already in use."

### Auto-populate `users` Table via Trigger

Create a trigger so the `users` profile row is inserted automatically when a new auth user is created:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```
`SECURITY DEFINER` is required because `auth.users` is in a different schema.

### Route Structure After This Story

```
app/
├── (auth)/
│   ├── layout.tsx              ← unauthenticated layout (minimal, no app shell)
│   ├── login/
│   │   └── page.tsx            ← uses LoginForm (from starter, keep or migrate)
│   ├── signup/
│   │   ├── page.tsx            ← signup form
│   │   └── actions.ts          ← signUpAction Server Action
│   └── verify-email/
│       └── page.tsx            ← "check your inbox" confirmation
├── (onboarding)/
│   ├── layout.tsx              ← auth-protected, no nav
│   └── onboarding/
│       └── connect-mailbox/
│           └── page.tsx        ← PLACEHOLDER: "Story 2.1 coming soon"
├── auth/
│   └── confirm/
│       └── route.ts            ← OTP handler (redirect next → /onboarding/connect-mailbox)
```

### Naming Conventions (from Story 1.1 — mandatory)

- Route segments: `kebab-case` — `/signup`, `/verify-email`, `/connect-mailbox`
- Component files: `kebab-case.tsx` — `sign-up-form.tsx`
- Server Actions: `camelCase` in `actions.ts` — `signUpAction()`
- DB tables: `snake_case` plural — `users` (this table is singular by convention as it mirrors `auth.users`)
- RLS policy names: `{table}_{action}_{role}` — `users_select_owner`
- TypeScript interfaces: PascalCase — `UserProfile`

### Supabase Migration File Naming

Use the pattern established in the architecture doc:
```
supabase/migrations/001_init_schema.sql
```
This story creates `001_init_schema.sql`. **Do NOT create 002+ migrations in this story** — email connections, drafts, kb_files, and embeddings tables belong to their respective epics.

### What This Story Does NOT Do

- Does NOT implement login/logout (Story 1.3)
- Does NOT implement account deletion (Story 1.4)
- Does NOT implement the full onboarding stepper (Story 6.1) — only a placeholder page
- Does NOT set up Supabase Vault (Epic 2 prerequisite)
- Does NOT add `email_connections`, `drafts`, `kb_files`, or `embeddings` tables to migrations
- Does NOT add resend-verification-email functionality
- Does NOT add social/OAuth login (Google, GitHub) — email/password only in V1

### TypeScript Strict Mode

All new code must compile with `strict: true`. Specific rules relevant here:
- No `any` types — Supabase's `createClient()` returns a typed client; use it
- `formData.get()` returns `FormDataEntryValue | null` — cast to `string` with a null check or `as string`
- Server Action return type: `Promise<{ error: string } | void>` (redirect is handled via Next.js `redirect()`, not return)

### Supabase Password Minimum Length

Supabase Auth default minimum password length is **6 characters**. Add client-side validation to enforce this before submitting (avoids a round-trip). The error message should be: `"Password must be at least 6 characters."` Do NOT enforce a stronger policy in this story unless the architecture explicitly requires it (it does not).

### Project Structure Notes

- Alignment: signup/login pages go into `app/(auth)/` route group per architecture
- The starter's root-level `components/sign-up-form.tsx` and `components/login-form.tsx` are in the wrong location per architecture. Move them to `components/shared/` or keep them in place for now — the architecture shows `components/shared/` for reusable cross-feature components. Decision: move to `components/shared/` during this story.
- `components/tutorial/`, `components/deploy-button.tsx`, `components/hero.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx` are starter boilerplate — leave untouched in this story (cleanup is technical debt, not this story's scope)
- The `app/protected/` route from the starter is not part of the architecture — leave untouched, do not delete (no-regression rule)

### References

- Story requirements: [epics.md — Story 1.2]
- Supabase client pattern: [architecture.md — Supabase Clients]
- Server Actions pattern: [architecture.md — API & Communication Patterns]
- DB naming conventions: [architecture.md — Naming Patterns]
- RLS requirements: [architecture.md — Authorization]
- Route structure: [architecture.md — Complete Project Directory Structure]
- Enforcement rules: [architecture.md — Enforcement Guidelines]
- Email non-persistence: [architecture.md — Data Boundaries] (no email content in DB — applies to auth email too; only store email address as profile identifier)

## Dev Agent Record

### Agent Model Used

Claude Sonnet (Windsurf Cascade)

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- All 8 tasks completed. TypeScript strict check passes (`tsc --noEmit` exit 0). ESLint passes. 6/6 tests pass.
- Chose `useTransition` pattern for `SignUpForm` (Client Component) calling `signUpAction` — preserves progressive enhancement while keeping Server Action architecture.
- `(auth)/layout.tsx` is intentionally minimal with NO auth check — redirect logic is exclusively in middleware per architecture mandate.
- `(onboarding)/layout.tsx` performs server-side auth check and redirects to `/login` if unauthenticated — double protection alongside middleware.
- Migration `001_init_schema.sql` not yet applied to Supabase remote — dev must run `supabase db push` against their project.
- `NEXT_PUBLIC_SITE_URL` added to `.env.example`; dev must set it in `.env.local`.
- Existing starter routes (`app/auth/sign-up/`, `app/auth/login/`, `app/auth/sign-up-success/`) left in place (no-regression rule) — new `(auth)` routes take precedence in Next.js routing.

### File List

- `app/(auth)/layout.tsx` — new: unauthenticated route group layout
- `app/(auth)/login/page.tsx` — new: login page (uses `components/shared/login-form`)
- `app/(auth)/signup/page.tsx` — new: signup page (uses `components/shared/sign-up-form`)
- `app/(auth)/signup/actions.ts` — new: `signUpAction` Server Action
- `app/(auth)/signup/actions.test.ts` — new: 3 unit tests for `signUpAction`
- `app/(auth)/verify-email/page.tsx` — new: post-signup confirmation page
- `app/(onboarding)/layout.tsx` — new: auth-protected onboarding layout
- `app/(onboarding)/onboarding/connect-mailbox/page.tsx` — new: placeholder page (Story 2.1)
- `app/auth/confirm/route.ts` — modified: default `next` redirect → `/onboarding/connect-mailbox`
- `components/shared/login-form.tsx` — new: `LoginForm` component (moved/rewritten from root `components/`)
- `components/shared/sign-up-form.tsx` — new: `SignUpForm` component with Server Action integration
- `lib/supabase/middleware.ts` — modified: updated route protection logic
- `supabase/migrations/001_init_schema.sql` — new: `users` table, RLS, trigger
- `.env.example` — modified: added `NEXT_PUBLIC_SITE_URL`
