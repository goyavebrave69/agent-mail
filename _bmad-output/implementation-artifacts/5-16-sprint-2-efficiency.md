---
title: 'Sprint 2 — Efficiency: Signature, Multi-Select & Bulk Actions, Keyboard Shortcuts'
type: 'feature'
created: '2026-04-21'
status: 'in-review'
baseline_commit: '980e34a0b8aaa4a650602484708b79a472d9f8d9'
context:
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Power users are forced to act on emails one by one with the mouse: no bulk archive/trash, no keyboard-driven flow, and new emails are sent without a professional signature. This slows down high-volume B2B inboxes and undermines the "Gmail muscle memory" experience.

**Approach:** Three independent additions on top of existing patterns — (1) persist an email signature in user settings and inject it into ComposeSheet/ManualCompose; (2) add multi-email checkbox selection with a `BulkActionBar`; (3) wire global keyboard shortcuts (`e`, `#`, `u`, `s`, `c`, `?`) to existing inbox actions.

## Boundaries & Constraints

**Always:**
- shadcn/ui + Tailwind only — no new UI dependencies
- Signature stored in `user_settings.email_signature` (new table via migration); default empty string
- Bulk actions (archive/trash) call new server actions accepting `string[]`; optimistic removal from list before DB confirms
- Keyboard shortcuts active only when focus is outside any `input`, `textarea`, or `[contenteditable]`
- ShortcutOverlay triggered by `?` key, uses shadcn `Dialog`
- Undo toast for bulk archive/bulk trash (same 5s sonner pattern as single-email)

**Ask First:**
- If migration conflicts with existing `invoice_settings` table structure — halt before proceeding

**Never:**
- Thread view, command palette (Sprint 3)
- Signature rich-text editor (plain textarea only for now)
- Bulk mark-unread or bulk star (archive + trash only for bulk)
- Keyboard shortcuts in settings, KB, or onboarding pages — inbox only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Signature inject — ComposeSheet | User opens ComposeSheet | Body pre-filled with `\n\n-- \n{signature}` if signature non-empty | Empty signature → no separator injected |
| Signature inject — ManualCompose | Draft generated or user composes reply | Signature appended below reply content | Same |
| Signature save | User types in signature textarea + clicks Enregistrer | `user_settings.email_signature` upserted; success toast | On error: keep field dirty, error toast |
| Multi-select — check one | User clicks checkbox on email row | Row highlighted; `BulkActionBar` slides in at bottom of list | — |
| Multi-select — select all | User clicks header checkbox | All visible (`filteredEmails`) selected | If 0 visible: no-op |
| Bulk archive | User clicks Archive in BulkActionBar | All selected emails removed from list optimistically; undo toast 5s | On DB error: restore, error toast |
| Bulk trash | User clicks Supprimer in BulkActionBar | Same pattern as bulk archive | Same |
| Bulk undo | User clicks Annuler within 5s | Selected emails restored to list | — |
| Keyboard `e` | Email selected, focus outside input | `handleArchive(selectedEmailId)` fires | No-op if no email selected |
| Keyboard `#` | Email selected, focus outside input | `handleTrash(selectedEmailId)` fires | No-op if no email selected |
| Keyboard `u` | Email selected | `handleMarkUnread(selectedEmailId)` | No-op if no email selected |
| Keyboard `s` | Email selected | `handleToggleStar(selectedEmailId, ...)` | No-op if no email selected |
| Keyboard `c` | Any state | Opens ComposeSheet (`setComposeOpen(true)`) | — |
| Keyboard `?` | Any state, focus outside input | Opens ShortcutOverlay Dialog | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/028_user_settings.sql` — new table: `user_settings(user_id PK, email_signature TEXT NOT NULL DEFAULT '', updated_at)`
- `app/(app)/settings/actions.ts` — add `getSignature` + `saveSignature` server actions
- `app/(app)/settings/page.tsx` — add signature textarea + Enregistrer button below existing settings
- `components/inbox/compose-sheet.tsx` — accept `signature?: string` prop; inject into initial body state
- `components/draft/manual-compose.tsx` — accept `signature?: string` prop; append to initial content
- `components/inbox/inbox-shell.tsx` — fetch signature on mount; pass to ComposeSheet + ManualCompose; add `selectedIds: Set<string>` state; add keyboard handler `useEffect`; wire bulk action handlers
- `app/(app)/inbox/[emailId]/actions.ts` — add `archiveManyEmails(ids[])` + `trashManyEmails(ids[])` server actions
- `components/inbox/bulk-action-bar.tsx` — new: slide-in bar with count + Archive + Supprimer + Tout désélectionner
- `components/inbox/inbox-list.tsx` — add checkbox to each row; header checkbox for select-all
- `components/inbox/shortcut-overlay.tsx` — new: Dialog listing all shortcuts in a 2-column grid

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/028_user_settings.sql` — create via MCP (`mcp__supabase__apply_migration`) — `user_settings` table with `user_id` FK to `auth.users`, `email_signature TEXT NOT NULL DEFAULT ''`, `updated_at TIMESTAMPTZ`; RLS: user can only read/write own row
- [x] `app/(app)/settings/actions.ts` — add `getSignature(): Promise<string>` and `saveSignature(sig: string): Promise<{success, error?}>` server actions
- [x] `app/(app)/settings/page.tsx` — add signature section: label "Signature email", `<Textarea>` (shadcn), Enregistrer button; load via `getSignature()` in the page server component — implemented as `components/settings/signature-settings.tsx` (client component) + `SignatureSettingsLoader` async wrapper in page
- [x] `components/inbox/compose-sheet.tsx` — add `signature?: string` prop; inject into body on open via `useEffect` + `Range`/`Selection` API to place cursor before separator
- [x] `components/draft/manual-compose.tsx` — add `signature?: string` prop; inject `\n\n-- \n{sig}` on mount via `signatureInjectedRef` guard when `manualContent` is empty
- [x] `app/(app)/inbox/[emailId]/actions.ts` — add `archiveManyEmails(ids: string[])` and `trashManyEmails(ids: string[])` using `.in('id', ids)` bulk update
- [x] `components/inbox/bulk-action-bar.tsx` — new component: bottom bar, visible when `selectedCount > 0`; shows `{n} sélectionné(s)`, Archive button, Supprimer button, Tout désélectionner link
- [x] `components/inbox/inbox-shell.tsx` — checkboxes added inline (email row list is in inbox-shell, not inbox-list); select-all per group; `inbox-list.tsx` not modified (it's used for routes/settings pages, not the shell)
- [x] `components/inbox/inbox-shell.tsx` — (a) fetch signature on mount; (b) `selectedIds` Set state; (c) `handleBulkArchive` + `handleBulkTrash` with undo toast; (d) keyboard `useEffect` with `isTypingTarget` guard; (e) `BulkActionBar` + `ShortcutOverlay` wired
- [x] `components/inbox/shortcut-overlay.tsx` — new Dialog component listing 6 shortcuts in 2-column grid
- [x] `components/inbox/` — tests: BulkActionBar (6 tests), ShortcutOverlay (5 tests)

**Acceptance Criteria:**
- Given a non-empty signature is saved, when ComposeSheet opens, then the body contains `\n\n-- \n{signature}` and cursor is before the separator
- Given a non-empty signature is saved, when a manual reply is composed, then signature is appended below the reply area
- Given at least one email is selected via checkbox, when the user clicks Archive in BulkActionBar, then all selected emails disappear from the list and an undo toast appears for 5s
- Given the user presses `e` with an email selected and focus outside any input, then the selected email is archived and auto-advance fires
- Given the user presses `?`, then the ShortcutOverlay dialog opens showing all 6 shortcuts
- Given focus is inside a `<textarea>`, when the user presses `e`, then no archive action fires

## Spec Change Log

## Design Notes

**Signature cursor placement:** ComposeSheet initialises `bodyHtml` as `''`. After injection, the cursor should land at position 0 (before the separator). Use `useEffect` + `Range`/`Selection` API to move cursor to start of contenteditable after mount when signature is present.

**`isTypingTarget` helper:** `(target: EventTarget | null): boolean => { const el = target as HTMLElement; return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable }` — centralise in a small util or inline in the effect.

**Bulk undo pattern:** Same `undoClicked` flag + `onAutoClose` as single-email undo. Restore by pushing IDs back to `localArchivedIds` / removing from it, then `router.refresh()` on auto-close.

**Select-all scoping:** Selects only `filteredEmails` (current visible set), not all emails. Header checkbox shows indeterminate state when some but not all are selected.

## Verification

**Commands:**
- `npm run typecheck` -- expected: 0 errors
- `npm run lint` -- expected: 0 warnings/errors
- `npm test` -- expected: all tests pass including new BulkActionBar + shortcut + ShortcutOverlay tests
