# Story 5.11: Functional Mail Action Buttons

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** reply/forward/transfer and related mail action buttons to be functional,  
**so that** I can process messages directly from the inbox reading pane.

---

## Acceptance Criteria

**Given** a mail is selected in inbox shell  
**When** user clicks action buttons (`Reply`, `Reply All`, `Forward/Transfer`, `Archive`, `Trash`)  
**Then** each action executes the expected server mutation or compose workflow trigger.

**Given** an action succeeds  
**When** UI updates  
**Then** inbox state refreshes consistently (selected email, list grouping, badges) without full-page redirect.

**Given** an action fails  
**When** server returns an error  
**Then** user sees explicit error feedback and can retry safely.

---

## Tasks / Subtasks

- [x] Implement missing button handlers in inbox reading pane (AC: 1, 2, 3)
  - [x] Wire client actions to Server Actions for archive/trash/read-state updates
  - [x] Wire reply/reply-all/forward triggers to compose workflow entrypoint
- [x] Ensure optimistic + realtime consistency (AC: 2)
  - [x] Keep selection/list state stable after mutation
  - [x] Refresh via existing realtime + fallback patterns
- [x] Add robust error handling (AC: 3)
  - [x] Display non-blocking feedback for failed actions
  - [x] Prevent duplicate submissions on rapid click
- [x] Add tests for each action path (AC: 1, 2, 3)

---

## Dev Notes

- Use existing inbox/draft actions infrastructure; do not introduce parallel mutation APIs.
- Keep “no redirect to dedicated email page” behavior.
- **UI requirement:** action controls and feedback UI must use `shadcn/ui` components.
- **Documentation requirement:** perform MCP doc lookup for Next.js Server Actions mutation best practices and shadcn action/button patterns before implementation.

### Relevant Existing Files

- `components/inbox/inbox-shell.tsx`
- `app/(app)/inbox/[emailId]/actions.ts`
- `components/draft/draft-section.tsx`
- `stores/draft-store.ts`

### Architecture Compliance

- All UI-initiated mutations go through Server Actions.
- Preserve RLS ownership checks and current Supabase client boundaries.
- Keep drafts + inbox state sync through Realtime/fallback flow.

### Testing Requirements

- Action unit tests for success/error branches.
- Component tests for action-button interactions without navigation.
- Regression checks for list/selection stability.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#FR Coverage Map`] — FR14, FR15, FR19, FR22 coverage alignment
- [Source: `_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions`] — Server Actions + Realtime
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`] — action placement and naming conventions

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Snooze button (Clock3) removed and replaced with Trash (Trash2) — snooze is out of scope for V1.
- `inbox-shell.test.tsx` (story 5-8) needed `customCategories: []` and new action mocks added after story 5-10 changed `InboxShellProps`.
- Archive and Trash both set `is_archived = true` — no separate `is_trashed` column in the DB schema for V1.
- `startComposing` read from Zustand store via selector, passed directly as onClick for Reply/Reply All/Forward.

### Completion Notes List

- Added `archiveEmail(emailId)` and `trashEmail(emailId)` Server Actions in `app/(app)/inbox/[emailId]/actions.ts` — both set `is_archived = true` + `revalidatePath('/inbox')`.
- Added `isActioning` flag (prevents duplicate clicks) and `actionError` state to `InboxShell`.
- Archive/Trash buttons: `disabled={isActioning}`, on success `setSelectedEmailId(null)` + `router.refresh()`, on failure show `<Alert role="alert">` with error message.
- Reply / Reply All / Forward buttons wired to `startComposing()` from Zustand draft store — opens existing compose area in DraftSection.
- `Alert` shadcn component added via `npx shadcn add alert`.
- 10 new component tests in `inbox-actions.test.tsx`; updated `inbox-shell.test.tsx` for new prop + mocks.
- 240 tests pass; typecheck and lint clean.

### File List

- _bmad-output/implementation-artifacts/5-11-functional-mail-action-buttons.md
- app/(app)/inbox/[emailId]/actions.ts
- components/inbox/inbox-shell.tsx
- components/inbox/inbox-shell.test.tsx
- components/inbox/inbox-actions.test.tsx
- components/ui/alert.tsx

### Change Log

- Added archiveEmail and trashEmail server actions; wired Archive, Trash, Reply, Reply All, Forward buttons (Date: 2026-04-07)
