# Story 1.3: User Login & Logout

Status: done

## Story

As a registered user,
I want to log in with my email and password and log out securely,
so that I can access my account and protect it when I'm done.

## Acceptance Criteria

1. **Given** the user submits valid credentials on the login page
   **When** the form is submitted
   **Then** a Supabase session is created server-side and the user is redirected to `/onboarding/connect-mailbox`
   **And** the session token is never exposed in localStorage or browser-accessible storage

2. **Given** the user is logged in and clicks logout
   **When** the action completes
   **Then** the server-side session is invalidated and the user is redirected to the login page
   **And** accessing any authenticated route redirects back to login

3. **Given** the user submits invalid credentials
   **When** the form is submitted
   **Then** an error message is displayed and no session is created

## Tasks / Subtasks

- [x] Task 1 — Fix `middleware.ts` to activate route protection (AC: #1, #2)
  - [x] Create `middleware.ts` at project root that imports and calls `updateSession` from `lib/supabase/proxy.ts`
  - [x] The file must export a `config` with a `matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`
  - [x] Verify session refresh works: authenticated users keep session on RSC navigation
  - [x] **IMPORTANT:** Do NOT rename `proxy.ts` — the architecture file references `lib/supabase/middleware.ts` but the actual file is `proxy.ts`. Create `middleware.ts` at root to delegate to `proxy.ts` as-is.

- [x] Task 2 — Refactor `LoginForm` to use a Server Action (AC: #1, #3)
  - [x] Create `app/(auth)/login/actions.ts` with `loginAction(formData: FormData)` Server Action
  - [x] Server Action calls `supabase.auth.signInWithPassword()` using `createClient()` from `lib/supabase/server.ts`
  - [x] On success → `redirect("/onboarding/connect-mailbox")`
  - [x] On error → return `{ error: string }` (do NOT throw)
  - [x] Rewrite `components/shared/login-form.tsx` to use the Server Action via `useTransition` (same pattern as `SignUpForm` in story 1.2)
  - [x] Remove the direct browser Supabase client call (`createClient` from `lib/supabase/client`) from `login-form.tsx` — the client-side Supabase call is NOT architecture-compliant for mutations
  - [x] Add server-side validation: check `email` and `password` are non-empty before calling Supabase

- [x] Task 3 — Implement logout Server Action (AC: #2)
  - [x] Create `app/(auth)/logout/actions.ts` with `logoutAction()` Server Action (no `formData` needed)
  - [x] Server Action calls `supabase.auth.signOut()` using `createClient()` from `lib/supabase/server.ts`
  - [x] After signOut → `redirect("/login")`
  - [x] Create a `LogoutButton` client component at `components/shared/logout-button.tsx`:
    - `'use client'` — uses `useTransition` to call `logoutAction`
    - Renders a `<Button>` (shadcn/ui) with loading state while pending
  - [x] Place a `<LogoutButton />` somewhere accessible in the authenticated shell (for now, a temporary placeholder in `app/(onboarding)/layout.tsx` is acceptable — Epic 6 will add the full nav)

- [x] Task 4 — Write unit tests (AC: #1, #3)
  - [x] Create `app/(auth)/login/actions.test.ts` (Vitest)
  - [x] Test: successful login calls `signInWithPassword` and triggers redirect
  - [x] Test: invalid credentials returns `{ error: string }` without throwing
  - [x] Test: missing email/password returns validation error before calling Supabase
  - [x] Follow the same mock pattern as `app/(auth)/signup/actions.test.ts` — see Story 1.2 for reference
  - [x] All tests run via `vitest run` without CI changes

### Review Findings

- [x] [Review][Decision] Redirect target mismatch between AC and implementation — resolved by aligning AC #1 to `/onboarding/connect-mailbox` (current canonical route for Epic 1).
- [x] [Review][Patch] Handle sign-out failure before redirecting in `logoutAction` [app/(auth)/logout/actions.ts:8]

## Dev Notes

### CRITICAL: `middleware.ts` Is Missing — Routes Are Not Protected

The current codebase has `lib/supabase/proxy.ts` (which contains `updateSession`) but **no `middleware.ts` at the project root**. Next.js only executes files named `middleware.ts` at the root. Until this is fixed, **zero route protection and zero session refresh is active**. This is the highest-priority fix in this story.

Create `middleware.ts` at root:
```typescript
// middleware.ts (project root)
import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

`proxy.ts` already implements the full route protection logic (public paths, authenticated redirect to `/onboarding/connect-mailbox`, unauthenticated redirect to `/login`). Do NOT rewrite it.

### Existing `LoginForm` Architecture Violation

`components/shared/login-form.tsx` currently calls Supabase directly from the browser:
```typescript
// ❌ Current (non-compliant) — direct browser mutation
const supabase = createClient() // from lib/supabase/client
const { error } = await supabase.auth.signInWithPassword({ email, password })
```

This violates the architecture mandate: "Server Actions for all UI-initiated mutations." Refactor to Server Action pattern (same as `signUpAction`).

### Server Action Pattern — `loginAction`

```typescript
// app/(auth)/login/actions.ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Invalid credentials. Please try again." }
  }

  redirect("/onboarding/connect-mailbox")
}
```

**Do NOT expose Supabase's internal error message** (`"Invalid login credentials"`) directly — return a generic message to prevent user enumeration.

### Server Action Pattern — `logoutAction`

```typescript
// app/(auth)/logout/actions.ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
```

### Supabase Client Pattern — MANDATORY

```typescript
// Server Actions only:
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client Components only (read-only / subscriptions):
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()
```

`lib/supabase/server.ts` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not the deprecated `ANON_KEY`).

### `LoginForm` Refactor Pattern

Follow the exact same `useTransition` approach used in `components/shared/sign-up-form.tsx`:
- Keep the component as `'use client'`
- Replace the `handleLogin` function with a form `action` calling `loginAction` via `useTransition`
- Display `result.error` from the Server Action response
- Show loading state while `isPending` is true

The existing UI (Card, Input, Label, Button from shadcn/ui) should remain unchanged — only the data-fetching mechanism changes.

### Logout Placement (Temporary)

Full navigation/sidebar is Epic 6 scope. For now, add `<LogoutButton />` to `app/(onboarding)/layout.tsx` as a temporary placement — just a small button in the corner. The button will be moved to the app shell in Story 6.1. Do NOT block story completion on building the full nav.

### Session Token Storage — Supabase SSR Handles This

By default, `@supabase/ssr` stores the session in **HTTP-only cookies** (not localStorage). This satisfies AC #1 ("session token never exposed in localStorage or browser-accessible storage"). No additional configuration is required — just ensure the Server Action pattern is used (which goes through `lib/supabase/server.ts` / `lib/supabase/proxy.ts`).

### Post-Login Redirect Target

The login redirect goes to `/onboarding/connect-mailbox`. This is consistent with Story 1.2 (where the confirmation email redirect also lands there). Story 4.2 (priority inbox view) will change this target to `/inbox` when the inbox is built.

### What This Story Does NOT Do

- Does NOT implement password reset / forgot password (out of scope for V1 stories)
- Does NOT implement social/OAuth login (Google, GitHub)
- Does NOT implement the full app navigation/sidebar (Story 6.1)
- Does NOT change the DB schema — no new migrations needed
- Does NOT touch `app/auth/confirm/route.ts` — OTP handler already redirects correctly

### Review Findings from Story 1.2 — Items to Address or Watch

Several issues from Story 1.2's review are relevant to this story:

- **`proxy.ts` inactif** — Fixed in Task 1 of this story (create `middleware.ts` at root)
- **`supabase.auth.getUser()` error not handled in `OnboardingLayout`** — This was flagged in 1.2. If not already fixed, add proper error handling in `app/(onboarding)/layout.tsx`:
  ```typescript
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')
  ```

### Project Structure Notes

- New files follow existing patterns:
  - `app/(auth)/login/actions.ts` — co-located Server Action (mirrors `app/(auth)/signup/actions.ts`)
  - `app/(auth)/logout/actions.ts` — logout Server Action
  - `components/shared/logout-button.tsx` — reusable Client Component
- `middleware.ts` goes at project root (same level as `package.json`, `next.config.ts`)
- Do NOT create a `middleware/` folder — it must be the single `middleware.ts` file

### References

- Story requirements: [epics.md — Story 1.3]
- Story 1.2 learnings: [1-2-user-registration-and-email-verification.md]
- Middleware pattern: [lib/supabase/proxy.ts] (existing `updateSession`)
- Supabase client pattern: [lib/supabase/server.ts], [architecture.md — Supabase Clients]
- Server Actions pattern: [app/(auth)/signup/actions.ts] (reference implementation)
- Route structure: [architecture.md — Complete Project Directory Structure]
- Sign-up form pattern: [components/shared/sign-up-form.tsx] (useTransition reference)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- All 4 tasks completed. TypeScript strict check passes (`tsc --noEmit` exit 0). 11/11 tests pass (4 new + 7 pre-existing).
- Task 1: `middleware.ts` créé à la racine — délègue à `lib/supabase/proxy.ts`. La protection des routes est désormais active.
- Task 2: `loginAction` Server Action créée. `LoginForm` refactorisée de Client Supabase → Server Action via `useTransition` (pattern identique à `SignUpForm`). Validation serveur email/password incluse.
- Task 3: `logoutAction` Server Action créée. `LogoutButton` Client Component ajouté. Bouton visible en haut à droite de l'onboarding layout (placement temporaire — sera déplacé en Story 6.1).
- Task 4: 4 tests unitaires Vitest pour `loginAction` — succès, credentials invalides, email manquant, password manquant.
- `OnboardingLayout` avait déjà la correction `error` de la review 1.2 (`if (error || !data.user)`).

### File List

- `middleware.ts` — new: activation du middleware Next.js (délègue à `lib/supabase/proxy.ts`)
- `app/(auth)/login/actions.ts` — new: `loginAction` Server Action
- `app/(auth)/login/actions.test.ts` — new: 4 tests unitaires pour `loginAction`
- `app/(auth)/logout/actions.ts` — new: `logoutAction` Server Action
- `components/shared/login-form.tsx` — modified: refacto Client Supabase → Server Action via `useTransition`
- `components/shared/logout-button.tsx` — new: `LogoutButton` Client Component
- `app/(onboarding)/layout.tsx` — modified: ajout `<LogoutButton />` en haut à droite
