---
title: 'Sprint 1 — Inbox Fundamentals'
type: 'feature'
created: '2026-04-21'
status: 'done'
baseline_commit: 'a05d51e40fab7fe74ce1b8bfa68ffdc864ce693e'
context:
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The inbox lacks standard email client behaviours (star, mark unread, compose new, undo after archive/trash, auto-advance, inbox zero state) that B2B users expect from Gmail/Outlook muscle memory. A dedicated Compose button is also missing from the sidebar. The public homepage is still a dev placeholder.

**Approach:** Finalize and wire up the Sprint 1 features already partially implemented in the working tree; apply the pending DB migration for starring; add the missing Compose button in the sidebar; replace the placeholder homepage with the new landing page. No new architecture — all work builds on existing patterns.

## Boundaries & Constraints

**Always:**
- shadcn/ui + Tailwind only — no Framer Motion, no new UI dependencies
- All DB actions follow existing supabase server-action patterns with optimistic local state
- UndoToast uses `sonner` (already installed) — 5-second window, `bottom-right`
- Star state persisted to `emails.is_starred` via `toggleStarEmail` server action
- Send undo is **out of scope** — sending is irreversible; the toast for send is informational only (no Annuler button)

**Ask First:**
- If migration 027 fails to apply (column already exists or conflict) — halt before proceeding with star feature

**Never:**
- Keyboard shortcuts (Sprint 2)
- Bulk select / BulkActionBar (Sprint 2)
- Thread view, Command Palette (Sprint 3)
- New email sync or inbox real-time changes (existing Realtime channel handles this)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Star toggle — off→on | User clicks star on unstarred email | `is_starred = true` persisted; star icon filled amber; instant optimistic update | On DB error: revert local state, show error toast |
| Star toggle — on→off | User clicks star on starred email | `is_starred = false` persisted; star icon returns to ghost | Same |
| Mark as unread | User clicks "Marquer non lu" | Email shows unread dot in list; `is_read = false` in DB | On error: revert, toast |
| Archive with undo | User clicks Archive (or `e`) | Email disappears from list + auto-advance; undo toast 5s | Undo click: `unarchiveEmail` restores email; toast dismisses |
| Trash with undo | User clicks Trash (or `#`) | Email disappears + auto-advance; undo toast 5s | Undo click: `untrashEmail` restores email |
| Compose new | User clicks Compose button in sidebar | ComposeSheet slides in from right | — |
| Compose send | User fills À/Objet/Corps and clicks Envoyer | Email sent via `sendNewEmail`; sheet closes; success toast | On error: keep sheet open, show inline error |
| Compose close with content | User presses ✕ with text in body | Sheet stays open (no backdrop dismiss); ✕ closes immediately (no confirmation for now) | — |
| Inbox zero | Last email processed or inbox empty on load | `InboxZeroState` displayed in detail panel | — |
| Auto-advance | User archives/sends current email | Next email by `priority_rank` DESC auto-selected; if none, previous; if list empty → zero state | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/027_emails_starred.sql` — pending migration: adds `is_starred BOOLEAN NOT NULL DEFAULT false` to `emails`
- `app/(app)/inbox/[emailId]/actions.ts` — `toggleStarEmail`, `markEmailAsUnread`, `unarchiveEmail` (already written, needs migration applied)
- `app/(app)/inbox/actions.ts` — `sendNewEmail` server action for ComposeSheet
- `components/inbox/inbox-shell.tsx` — central inbox: local state maps for star/unread/archived, `advanceAfterAction`, `composeOpen`, `processedCount`
- `components/inbox/compose-sheet.tsx` — new full-height Sheet for composing emails
- `components/inbox/inbox-zero-state.tsx` — inbox empty state component
- `components/layout/app-sidebar.tsx` — sidebar: Compose button missing, needs to be added top
- `app/page.tsx` — public homepage: replaced with landing page imports
- `components/landing/` — 7 new landing page components (hero, features, how-it-works, etc.)

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/027_emails_starred.sql` -- apply via MCP (`mcp__supabase__apply_migration`) -- migration not yet applied; star toggle hits DB error without it
- [x] `components/layout/app-sidebar.tsx` -- add Compose button at top of sidebar -- currently missing; `setComposeOpen` exists in inbox-shell but no sidebar trigger
- [x] `components/inbox/inbox-shell.tsx` -- reset `processedCount` to 0 on component mount (not on every render) -- count currently never resets across sessions
- [x] `components/inbox/inbox-shell.tsx` -- verify `draftConfidenceScore` state is wired to draft generation events; remove if orphaned -- declared but never updated
- [x] `components/inbox/inbox-shell.tsx` -- send toast: informational only, no Annuler button (send is irreversible) -- align with constraint above
- [x] `lib/ai/triage.ts` + `app/(app)/inbox/actions.ts` -- run `npm run typecheck && npm run lint` and fix any type errors introduced by uncommitted changes
- [x] `components/inbox/` -- add tests for `ComposeSheet` (renders, send flow, close) and `InboxZeroState` (renders)

**Acceptance Criteria:**
- Given the inbox has no emails (or all processed), when the detail panel renders, then `InboxZeroState` is displayed
- Given an email is unstarred, when the user clicks the star icon, then the star fills amber instantly and `is_starred = true` is persisted to DB
- Given the user clicks the Compose button in the sidebar, when the sheet opens, then `À:`, `Objet:`, and body fields are visible and focusable
- Given the user composes and sends a new email, when send succeeds, then the sheet closes and a success toast appears
- Given the user archives an email, when the action completes, then an undo toast appears for 5 seconds and the next email auto-loads
- Given the user clicks Annuler in the undo toast within 5s, then the email is restored to inbox
- Given the public homepage is visited, then the new landing page renders (hero, features, KB section, CTA)

## Spec Change Log

## Design Notes

**Compose button placement:** Top of sidebar, full-width, `variant="default"` (MailAgent blue), `PenSquare` icon + "Composer" label. Triggers `setComposeOpen(true)` passed down via prop or via a shared state/callback.

**processedCount scope:** Counts emails processed in the current browser session. Reset on component mount is sufficient — no persistence needed.

**draftConfidenceScore orphan:** If the state is declared but no setter is called from draft generation events, remove it cleanly rather than leaving dead code.

## Suggested Review Order

**DB Schema**

- Migration: new `is_starred` column + partial index, safe for existing rows
  [`027_emails_starred.sql:1`](../../supabase/migrations/027_emails_starred.sql#L1)

**Inbox Shell — State & Actions (entry point)**

- Central hub: local optimistic state maps (star, read, archived) + 6 action handlers
  [`inbox-shell.tsx:130`](../../components/inbox/inbox-shell.tsx#L130)

- Undo toast pattern: `undoClicked` flag prevents double `router.refresh()` on auto-close
  [`inbox-shell.tsx:240`](../../components/inbox/inbox-shell.tsx#L240)

- `?compose=1` URL-param detection: `searchParams` in deps enables back/forward support
  [`inbox-shell.tsx:155`](../../components/inbox/inbox-shell.tsx#L155)

- Auto-advance after action: next → previous → null, using `filteredEmails` snapshot
  [`inbox-shell.tsx:211`](../../components/inbox/inbox-shell.tsx#L211)

- Auto-advance guard: `userDeselectedRef` prevents immediate re-selection after markUnread
  [`inbox-shell.tsx:420`](../../components/inbox/inbox-shell.tsx#L420)

- InboxZeroState rendered in both panels when inbox is empty
  [`inbox-shell.tsx:496`](../../components/inbox/inbox-shell.tsx#L496)

**Compose Sheet (new component)**

- Full-height Sheet: controlled open/close, `onInteractOutside` prevents backdrop dismiss
  [`compose-sheet.tsx:51`](../../components/inbox/compose-sheet.tsx#L51)

- Send flow: To/body validation → `sendNewEmail` → `toast.success` → `resetAndClose()`
  [`compose-sheet.tsx:89`](../../components/inbox/compose-sheet.tsx#L89)

**Sidebar — Compose Button**

- Compose button: merges `compose=1` into current searchParams to preserve active filters
  [`app-sidebar.tsx:459`](../../components/layout/app-sidebar.tsx#L459)

**Inbox Zero State (new component)**

- Singular/plural count + default message when `processedCount === 0`
  [`inbox-zero-state.tsx:1`](../../components/inbox/inbox-zero-state.tsx#L1)

**Tests**

- ComposeSheet: 7 tests — render, validation, send success/error, close, Cc/Bcc
  [`compose-sheet.test.tsx:1`](../../components/inbox/compose-sheet.test.tsx#L1)

- InboxZeroState: 5 tests — title, count variants, singular, default fallback
  [`inbox-zero-state.test.tsx:1`](../../components/inbox/inbox-zero-state.test.tsx#L1)

- Pre-existing test suite: 12 test files updated for French i18n (aria-labels, button labels)
  [`manual-compose.test.tsx:1`](../../components/draft/manual-compose.test.tsx#L1)

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 errors
- `npm run lint` -- expected: 0 warnings/errors
- `npm test` -- expected: all existing tests pass + new ComposeSheet/InboxZeroState tests green
