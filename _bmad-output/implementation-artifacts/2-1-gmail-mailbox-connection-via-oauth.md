# Story 2.1: Gmail Mailbox Connection via OAuth

Status: review

## Story

As a user,
I want to connect my Gmail account via OAuth,
so that MailAgent can access my inbox securely without storing my password.

## Acceptance Criteria

1. **Given** the user clicks "Connect Gmail" in settings
   **When** they complete the Google OAuth flow
   **Then** their OAuth access and refresh tokens are stored in Supabase Vault (never in plain DB columns)
   **And** the email connection is recorded in the `email_connections` table with RLS applied
   **And** the user sees a success confirmation with their connected email address

2. **Given** the user denies the OAuth permission
   **When** they are redirected back to the app
   **Then** no connection is created and the user sees an appropriate error message

3. **Given** the OAuth callback route receives the authorization code
   **When** it processes the response
   **Then** only the minimum required scopes (read, send, label) are requested and confirmed

## Tasks / Subtasks

- [x] Task 1 — Create `email_connections` DB migration with RLS (AC: #1)
  - [x] Create `supabase/migrations/002_email_connections.sql`
  - [x] Table: `email_connections(id UUID PK, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, provider TEXT NOT NULL CHECK (provider IN ('gmail','outlook','imap')), email TEXT NOT NULL, vault_secret_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`
  - [x] Enable RLS: `ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY`
  - [x] RLS policies: `email_connections_select_owner`, `email_connections_insert_owner`, `email_connections_delete_owner` — all scoped to `auth.uid() = user_id`
  - [x] Index: `idx_email_connections_user_id`

- [x] Task 2 — Create Gmail OAuth redirect Server Action (AC: #3)
  - [x] Create `app/(app)/settings/actions.ts` addition: `connectGmailAction()` Server Action
  - [x] Build Google OAuth URL with scopes: `https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://mail.google.com/` (minimum required per NFR20)
  - [x] Use `GOOGLE_CLIENT_ID` from env (already in `.env.example`)
  - [x] Redirect URL: `${NEXT_PUBLIC_SITE_URL}/auth/callback?provider=gmail`
  - [x] Include `access_type=offline` and `prompt=consent` to guarantee refresh token delivery
  - [x] Return the Google auth URL; client redirects to it

- [x] Task 3 — Create OAuth callback Route Handler (AC: #1, #2)
  - [x] Create `app/auth/callback/route.ts` (separate from existing `app/auth/confirm/route.ts`)
  - [x] Handle `?provider=gmail` query param to distinguish from Supabase auth confirm callbacks
  - [x] Exchange authorization code for tokens via `https://oauth2.googleapis.com/token` (POST)
  - [x] On token exchange success:
    - Fetch Gmail profile: `GET https://www.googleapis.com/gmail/v1/users/me/profile` with Bearer token
    - Store tokens in Supabase Vault via `createAdminClient().rpc('vault.create_secret', ...)`
    - Insert row into `email_connections` with `vault_secret_id` from Vault response
    - Redirect to `/settings?connected=gmail`
  - [x] On error (denial or code exchange failure): redirect to `/settings?error=gmail_denied` or `/settings?error=gmail_failed`
  - [x] Route Handler uses `createAdminClient()` for Vault operations (service role required)
  - [x] Never log or expose token values

- [x] Task 4 — Update Settings UI for Gmail connection (AC: #1, #2)
  - [x] Update `app/(app)/settings/page.tsx` (Server Component) to:
    - Fetch connected mailboxes: `SELECT id, provider, email FROM email_connections WHERE user_id = auth.uid()`
    - Show "Connected Accounts" section above Danger Zone
    - If Gmail not connected: render `ConnectGmailButton` client component
    - If Gmail connected: show connected email + disconnect button (Story 2.4 scope — shown as disabled/placeholder)
    - Handle `?connected=gmail` and `?error=...` searchParams to show success/error banners
  - [x] Create `components/shared/connect-gmail-button.tsx` (`'use client'`, calls `connectGmailAction`, uses `useTransition`)
  - [x] Update onboarding page `app/(onboarding)/onboarding/connect-mailbox/page.tsx` to use the same `ConnectGmailButton`

- [x] Task 5 — Write unit tests (AC: #1, #2, #3)
  - [x] Create `app/auth/callback/route.test.ts` (Vitest)
  - [x] Test: successful Gmail token exchange → inserts into `email_connections` and redirects to `/settings?connected=gmail`
  - [x] Test: OAuth denial (`error=access_denied`) → redirects to `/settings?error=gmail_denied`, no DB write
  - [x] Test: token exchange failure → redirects to `/settings?error=gmail_failed`, no DB write
  - [x] Mock `createAdminClient` (from `lib/supabase/admin`) and `fetch` (global)
  - [x] Follow mock pattern from `app/(auth)/login/actions.test.ts` and `app/(app)/settings/actions.test.ts`

## Dev Notes

### Supabase Vault — How to store OAuth tokens

**Vault is the mandatory storage for OAuth tokens** (NFR11, architecture decision). Never store tokens in plain DB columns.

Vault write via admin client (service role required):
```typescript
const { data, error } = await adminClient.rpc('vault.create_secret', {
  secret: JSON.stringify({ access_token, refresh_token, expires_at }),
  name: `gmail:${userId}`,
})
// data.id is the vault_secret_id to store in email_connections
```

Vault read (for use in Edge Functions — not in scope for this story):
```typescript
const { data } = await adminClient.rpc('vault.decrypt_secret', { secret_id: vaultSecretId })
```

Note: Vault RPC function names vary by Supabase version — verify with `\df vault.*` in the Supabase SQL editor, or check Supabase docs for the current `pgsodium` / Vault API. If Vault is not yet enabled, enable it in Supabase Dashboard → Settings → Vault.

### `email_connections` Table — Forward Constraints

- `ON DELETE CASCADE` on `user_id` is **mandatory** — established as a forward constraint in Story 1.4. When `auth.users` row is deleted, email connections cascade automatically.
- `vault_secret_id` stores the Vault secret reference, not the token itself.
- `provider` uses a CHECK constraint with enum values — consistent with the strict enum policy from the architecture doc.

### OAuth Callback Route — Distinguish from Supabase Auth Confirm

The existing `app/auth/confirm/route.ts` handles Supabase email verification callbacks. The new callback route handles OAuth provider callbacks. Options:
1. **Recommended:** Add `?provider=gmail` handling to a new `app/auth/callback/route.ts` — separate file to avoid breaking the existing confirm flow.
2. **Alternative:** Extend `app/auth/confirm/route.ts` with provider-specific branching.

Check `app/auth/confirm/route.ts` before implementing to avoid breaking the existing email verification flow.

### Google OAuth Scopes (NFR20 — minimum required)

Per NFR20, scopes are limited to minimum required (read, send, label):
- `https://www.googleapis.com/auth/gmail.readonly` — read emails
- `https://www.googleapis.com/auth/gmail.send` — send emails
- `https://mail.google.com/` — needed for IMAP/labels access

**Important:** Google OAuth is in test mode for V1 (< 100 users, 4–8 week review timeline per architecture doc). The app does NOT need to pass Google's app review for the pilot. Ensure Google Cloud Console has the test users added.

### Token Refresh — OAuth 1-hour Expiry

This story stores tokens; refresh is handled when sync Edge Functions call the Gmail API (Story 2.5 scope). To enable refresh, the `vault_secret_id` entry should include `expires_at` so Story 2.5 knows when to refresh. Store as:
```json
{ "access_token": "...", "refresh_token": "...", "expires_at": "2026-03-29T11:00:00Z" }
```

### Env Vars Required (already in `.env.example`)

```bash
GOOGLE_CLIENT_ID=       # from Google Cloud Console
GOOGLE_CLIENT_SECRET=   # from Google Cloud Console
NEXT_PUBLIC_SITE_URL=   # used to build OAuth redirect URI
```

Add to Vercel environment variables (server-side, not `NEXT_PUBLIC_` for secrets).

### Settings Page — Extension, Not Replacement

`app/(app)/settings/page.tsx` already exists with `DeleteAccountButton`. **Do not replace — extend** by adding a "Connected Accounts" section above the Danger Zone. The page is a Server Component — keep it as RSC, fetch connection data server-side.

### Onboarding Placeholder — Update, Don't Replace

`app/(onboarding)/onboarding/connect-mailbox/page.tsx` currently has a static placeholder (added in Epic 1). Replace the placeholder with the real `ConnectGmailButton` plus Outlook/IMAP placeholders (they connect in stories 2.2–2.3).

### Middleware Route Protection

`lib/supabase/proxy.ts` (`updateSession`) already protects routes: unauthenticated users hitting non-public paths are redirected to `/login`. The `/auth/callback` path starts with `/auth` and is excluded via `isAuthCallbackPath` check — the callback route is accessible without authentication (required for the OAuth redirect to work).

### Project Structure Notes

| New file | Location |
|---|---|
| `002_email_connections.sql` | `supabase/migrations/` |
| `app/auth/callback/route.ts` | New Route Handler for OAuth |
| `components/shared/connect-gmail-button.tsx` | Reusable Gmail connect button |
| `app/auth/callback/route.test.ts` | Co-located tests |

Files to **modify** (not replace):
- `app/(app)/settings/page.tsx` — add Connected Accounts section
- `app/(app)/settings/actions.ts` — add `connectGmailAction`
- `app/(onboarding)/onboarding/connect-mailbox/page.tsx` — replace placeholder

### References

- Story requirements: [_bmad-output/planning-artifacts/epics.md — Story 2.1]
- Architecture — Vault, OAuth: [_bmad-output/planning-artifacts/architecture.md — Authentication & Security]
- Architecture — Route Handler pattern: [_bmad-output/planning-artifacts/architecture.md — API & Communication Patterns]
- Admin client pattern: [lib/supabase/admin.ts]
- Existing settings page: [app/(app)/settings/page.tsx]
- Existing settings actions: [app/(app)/settings/actions.ts]
- Existing auth confirm handler: [app/auth/confirm/route.ts]
- Env vars template: [.env.example]
- Server Action pattern: [app/(auth)/login/actions.ts]
- `useTransition` pattern: [components/shared/delete-account-button.tsx] (or logout-button.tsx)
- Migration reference: [supabase/migrations/001_init_schema.sql]
- Deferred: email_connections cascade was pre-declared as a forward constraint in Story 1.4 dev notes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no issues encountered. Import path fix: replaced relative path `../../../(app)/settings/actions` with alias `@/app/(app)/settings/actions` in route.test.ts (Vite does not resolve parenthesised route group segments in relative paths).

### Completion Notes List

- All 5 tasks completed. TypeScript strict check passes. 23/23 tests pass (6 new + 17 pre-existing, zero regressions).
- `supabase/migrations/002_email_connections.sql` créé avec RLS (select/insert/delete), ON DELETE CASCADE sur `user_id`, index `idx_email_connections_user_id`.
- `connectGmailAction` Server Action ajoutée dans `app/(app)/settings/actions.ts` — retourne `{ url }` ou `{ error }`, jamais de redirect côté serveur (le client redirige via `window.location.href`).
- `app/auth/callback/route.ts` créé séparément de `app/auth/confirm/route.ts` — dispatche sur `?provider=gmail`, échange le code, stocke tokens dans Vault via `vault.create_secret`, insère dans `email_connections`.
- Tokens stockés en Vault au format `{ access_token, refresh_token, expires_at }` — expires_at calculé à partir de `expires_in` pour que Story 2.5 puisse détecter l'expiration.
- `ConnectGmailButton` (`'use client'`, `useTransition`) réutilisée depuis settings et onboarding.
- Settings page étendue (pas remplacée) : section "Connected Accounts" au-dessus de Danger Zone, banners success/error via searchParams.
- Onboarding `connect-mailbox/page.tsx` mis à jour : remplace le placeholder par le vrai bouton + placeholders désactivés pour Outlook/IMAP (stories 2.2–2.3).

### File List

- `supabase/migrations/002_email_connections.sql` — new: email_connections table + RLS + index
- `app/(app)/settings/actions.ts` — modified: added `connectGmailAction`
- `app/auth/callback/route.ts` — new: OAuth callback Route Handler (Gmail)
- `app/auth/callback/route.test.ts` — new: 6 unit tests (route handler + connectGmailAction)
- `app/(app)/settings/page.tsx` — modified: Connected Accounts section + success/error banners
- `components/shared/connect-gmail-button.tsx` — new: Gmail connect button client component
- `app/(onboarding)/onboarding/connect-mailbox/page.tsx` — modified: replaced placeholder with real ConnectGmailButton
