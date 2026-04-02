# Story 5.11: Functional Mail Action Buttons

Status: ready-for-dev

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

- [ ] Implement missing button handlers in inbox reading pane (AC: 1, 2, 3)
  - [ ] Wire client actions to Server Actions for archive/trash/read-state updates
  - [ ] Wire reply/reply-all/forward triggers to compose workflow entrypoint
- [ ] Ensure optimistic + realtime consistency (AC: 2)
  - [ ] Keep selection/list state stable after mutation
  - [ ] Refresh via existing realtime + fallback patterns
- [ ] Add robust error handling (AC: 3)
  - [ ] Display non-blocking feedback for failed actions
  - [ ] Prevent duplicate submissions on rapid click
- [ ] Add tests for each action path (AC: 1, 2, 3)

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

Codex (GPT-5)

### Debug Log References

- Story created via `.claude/skills/bmad-create-story` workflow

### Completion Notes List

- Ordered before manual-draft button story to first establish reliable action wiring in reading pane.

### File List

- _bmad-output/implementation-artifacts/5-11-functional-mail-action-buttons.md
