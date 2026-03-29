# Story 2.3: IMAP/SMTP Mailbox Connection

Status: review

## Story

As a user,
I want to connect any IMAP/SMTP mailbox using my credentials,
so that I can use MailAgent with any email provider (OVH, corporate SMTP, etc.).

## Acceptance Criteria

1. **Given** the user enters their IMAP server, port (993), username, and password
   **When** they submit the connection form
   **Then** MailAgent tests the connection using TLS on port 993
   **And** if successful, the credentials are stored encrypted in Supabase Vault
   **And** the connection is recorded and the user sees a confirmation

2. **Given** the IMAP credentials are incorrect or the server is unreachable
   **When** the user submits
   **Then** a clear error is displayed (invalid credentials vs. server unreachable) and no connection is saved

---

## Context & Prerequisites

**Stories 2.1 (Gmail) and 2.2 (Outlook) must be merged before implementing this story.** Story 2.3 extends the same infrastructure:

- `email_connections` table — already has `provider CHECK ('gmail','outlook','imap')`
- `create_vault_secret()` RPC wrapper (migration `003_vault_wrapper.sql`) — reuse as-is
- `app/(app)/settings/actions.ts` — add `connectImapAction()` (Server Action, not OAuth)
- `app/(app)/settings/page.tsx` — add IMAP connection form in "Connected Accounts" section
- `components/shared/` — add IMAP form component

**Key difference from 2.1/2.2:** IMAP is not OAuth — it's a form submission that tests the connection server-side before storing credentials. No redirect flow, no callback route needed.

**IMAP connection test must happen server-side** — never expose IMAP credentials to the browser beyond the initial form submission.

---

## Tasks / Subtasks

- [x] Task 1 — Add `connectImapAction()` Server Action (AC: #1, #2)
  - [x] Add to `app/(app)/settings/actions.ts`
  - [x] Accept params: `{ host: string, port: number, username: string, password: string }`
  - [x] Validate inputs server-side: host non-empty, port 993 or 143 (default 993), username non-empty, password non-empty
  - [x] Test IMAP connection via `imapflow` npm package (see Dev Notes)
  - [x] On connection test success:
    - Store credentials in Vault: `adminClient.rpc('create_vault_secret', { secret: JSON.stringify({ host, port, username, password }), name: \`imap:${userId}\` })`
    - Upsert into `email_connections`: `{ user_id, provider: 'imap', email: username, vault_secret_id, updated_at }`
    - Return `{ success: true }`
  - [x] On connection failure: return `{ error: 'IMAP_AUTH_FAILED' | 'IMAP_UNREACHABLE' | 'IMAP_INVALID_INPUT' }` — distinguish error types
  - [x] Never log or return password in any error/log message

- [x] Task 2 — Create `ImapConnectForm` client component (AC: #1, #2)
  - [x] Create `components/shared/imap-connect-form.tsx` (`'use client'`)
  - [x] Form fields: IMAP server (text), Port (number, default 993), Username/Email (text), Password (password input)
  - [x] Use `useTransition` + `useActionState` or `useState` pattern — same as other buttons in this project
  - [x] On submit: call `connectImapAction()`, show loading state during pending
  - [x] On success: show inline success message (no redirect needed — stays on page)
  - [x] On error: show specific error — `IMAP_AUTH_FAILED` → "Invalid username or password", `IMAP_UNREACHABLE` → "Server unreachable — check host and port", `IMAP_INVALID_INPUT` → "Please fill all fields"
  - [x] Use shadcn/ui `Input`, `Button`, `Label` components (consistent with project)

- [x] Task 3 — Update Settings UI (AC: #1, #2)
  - [x] Update `app/(app)/settings/page.tsx`:
    - Add IMAP/SMTP row in "Connected Accounts" section (below Gmail and Outlook)
    - If IMAP connected: show `connection.email` + disabled disconnect placeholder (Story 2.4)
    - If IMAP not connected: render `ImapConnectForm` (inline, no modal needed)
  - [x] Update onboarding page `app/(onboarding)/onboarding/connect-mailbox/page.tsx`:
    - Replace the disabled "Connect IMAP/SMTP (coming soon)" button with `ImapConnectForm`

- [x] Task 4 — Write unit tests (AC: #1, #2)
  - [x] Create `app/(app)/settings/actions.test.ts` additions (extend existing file)
  - [x] Mock `imapflow` and `createAdminClient`
  - [x] Test: valid credentials + successful IMAP test → vault upsert called, returns `{ success: true }`
  - [x] Test: IMAP auth failure → returns `{ error: 'IMAP_AUTH_FAILED' }`, no vault write
  - [x] Test: IMAP server unreachable (connection timeout/refused) → returns `{ error: 'IMAP_UNREACHABLE' }`, no vault write
  - [x] Test: missing fields → returns `{ error: 'IMAP_INVALID_INPUT' }`, no IMAP test attempted
  - [x] Test: not authenticated (no user session) → returns `{ error: 'Not authenticated.' }`

---

## Dev Notes

### IMAP Connection Test — `imapflow` Package

Use [`imapflow`](https://imapflow.com/) for the server-side IMAP connection test. It's the modern IMAP client for Node.js (used by Nodemailer ecosystem).

**Install:**
```bash
npm install imapflow
```

**Connection test pattern:**
```typescript
import { ImapFlow } from 'imapflow'

async function testImapConnection(host: string, port: number, username: string, password: string): Promise<void> {
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993, // TLS for 993, STARTTLS for 143
    auth: { user: username, pass: password },
    logger: false, // suppress internal logging
    connectionTimeout: 10000, // 10s timeout
    greetingTimeout: 5000,
  })

  await client.connect()
  await client.logout()
}
```

**Error discrimination:**
```typescript
try {
  await testImapConnection(host, port, username, password)
} catch (e: unknown) {
  const err = e as { code?: string; responseCode?: string; message?: string }
  if (err.responseCode === 'AUTHENTICATIONFAILED' || err.message?.includes('Invalid credentials')) {
    return { error: 'IMAP_AUTH_FAILED' }
  }
  // Connection refused, timeout, DNS failure → unreachable
  return { error: 'IMAP_UNREACHABLE' }
}
```

**Important:** `imapflow` runs in Node.js only — this Server Action runs server-side, never in the browser. ✅

### Vault Storage — Same Pattern as 2.1/2.2 (CRITICAL)

Use the `public.create_vault_secret()` RPC wrapper — **never call `vault.*` schema directly**:

```typescript
const { data: vaultSecretId, error: vaultError } = await adminClient.rpc('create_vault_secret', {
  secret: JSON.stringify({ host, port, username, password }),
  name: `imap:${userId}`,
})
```

Upsert (not insert) to handle reconnection:
```typescript
await adminClient.from('email_connections').upsert(
  { user_id: userId, provider: 'imap', email: username, vault_secret_id: vaultSecretId as string, updated_at: new Date().toISOString() },
  { onConflict: 'user_id,provider' }
)
```

### No New DB Migration Needed

The `email_connections` table already supports `provider = 'imap'` via the CHECK constraint from migration `002_email_connections.sql`. No migration needed for this story.

### No OAuth Flow — Key Difference

Unlike 2.1/2.2, there is no redirect/callback involved:
- The Server Action receives credentials, tests them, stores them, and returns a result — all in one call.
- No `route.ts` changes needed.
- No state/cookie pattern needed (no CSRF risk — it's a direct form POST via Server Action).

### Standard Ports

Per NFR22: IMAP standard port 993 (TLS) or 143 (STARTTLS). Default the UI to 993.

### Architecture Compliance

- Credentials → Supabase Vault only (NFR11) ✅
- Server Action for form submission (not Route Handler) ✅
- `createAdminClient()` for Vault/DB writes (service role required) ✅
- `createClient()` for user identity only ✅
- Never log or return the password ✅
- RLS on `email_connections` — already enforced ✅

### Files to Create / Modify

| Action | File |
|--------|------|
| Modify | `app/(app)/settings/actions.ts` — add `connectImapAction()` |
| Create | `components/shared/imap-connect-form.tsx` |
| Modify | `app/(app)/settings/page.tsx` — add IMAP row |
| Modify | `app/(onboarding)/onboarding/connect-mailbox/page.tsx` — replace placeholder |
| Modify | `app/(app)/settings/actions.test.ts` — add IMAP tests |

### Previous Story Patterns to Follow

From stories 2.1/2.2 (available on `story/2-2-outlook-oauth` branch):
- Server Actions always return `{ error: string }` or success shape — never throw to client
- `createAdminClient()` from `@/lib/supabase/admin`
- `createClient()` from `@/lib/supabase/server`
- `useTransition` in client components for pending state
- shadcn/ui `Button` with `disabled={isPending}` during loading
- Tests: `vi.resetModules()` + `vi.clearAllMocks()` in `beforeEach`, dynamic `import()` after mocking

---

## Dev Agent Record

### Implementation Plan

- Added `connectImapAction()` to `actions.ts` using `imapflow` for server-side IMAP connection test before storing credentials in Vault
- Created `ImapConnectForm` client component following `useTransition` pattern consistent with `ConnectGmailButton` / `ConnectOutlookButton`
- Updated Settings page to show IMAP row with inline form (or connected state with disabled Disconnect for Story 2.4)
- Updated onboarding connect-mailbox page to replace the disabled placeholder with the live `ImapConnectForm`
- No DB migration needed — `provider = 'imap'` was already supported by the CHECK constraint

### Completion Notes

- All 4 tasks completed; 5 new IMAP tests added (10 total in actions.test.ts), 34/34 tests passing, 0 TypeScript errors
- `imapflow` installed as production dependency (Node.js server-side only — never runs in browser)
- Error discrimination: `AUTHENTICATIONFAILED` responseCode or "Invalid credentials" message → `IMAP_AUTH_FAILED`; all other errors → `IMAP_UNREACHABLE`
- Password never logged or returned in any error shape

---

## File List

- `app/(app)/settings/actions.ts` — added `connectImapAction()` and `testImapConnection()` helper
- `app/(app)/settings/actions.test.ts` — added 5 IMAP unit tests + top-level `imapflow` mock
- `components/shared/imap-connect-form.tsx` — new client component
- `app/(app)/settings/page.tsx` — added IMAP row in ConnectedAccounts
- `app/(onboarding)/onboarding/connect-mailbox/page.tsx` — replaced disabled placeholder with `ImapConnectForm`
- `package.json` — added `imapflow` dependency
- `package-lock.json` — updated lockfile

---

## Change Log

- 2026-03-29: Implemented story 2.3 — IMAP/SMTP mailbox connection via `imapflow`, Server Action, form UI, and unit tests
