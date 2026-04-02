# Story 5.9: Collapsible Mail Navigation Sidebar

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** the left mail navigation to be collapsible,  
**so that** I can focus on the email list and reading pane when needed.

---

## Acceptance Criteria

**Given** the inbox shell is displayed  
**When** the user toggles sidebar collapse  
**Then** the left navigation collapses/expands smoothly without layout break.

**Given** the expanded sidebar  
**When** the user views primary sections  
**Then** the top group displays `Inbox`, `Drafts`, `Sent`, `Trash`  
**And** a visible separator appears before secondary navigation pages below.

**Given** the sidebar is collapsed and user reloads during same session  
**When** inbox re-renders  
**Then** collapse state persists for session usability.

---

## Tasks / Subtasks

- [ ] Implement collapsible sidebar behavior in `components/inbox/inbox-shell.tsx` (AC: 1, 2, 3)
  - [ ] Add collapse trigger and state handling
  - [ ] Render primary and secondary navigation groups with separator
  - [ ] Preserve responsive behavior across desktop sizes
- [ ] Use shadcn sidebar primitives where relevant (AC: 1, 2)
  - [ ] Reuse generated sidebar component patterns instead of custom reinvention
- [ ] Add interaction tests (AC: 1, 2, 3)
  - [ ] Verify collapse/expand behavior
  - [ ] Verify section ordering and separator rendering

---

## Dev Notes

- Do not modify top app navbar in this story.
- Keep existing inbox pane behavior and selected-email state intact.
- **UI requirement:** all added/reworked UI controls must use `shadcn/ui` components.
- **Documentation requirement:** use MCP documentation lookup for `shadcn/ui` sidebar and Next.js client component patterns before coding.

### Relevant Existing Files

- `components/inbox/inbox-shell.tsx`
- `components/ui/sidebar.tsx`
- `hooks/use-mobile.ts`

### Architecture Compliance

- Keep feature code under `/components/inbox`.
- Do not edit `/components/ui/*` generated primitives unless absolutely required.
- Preserve App Router page structure.

### Testing Requirements

- Component tests for collapse state transitions and navigation grouping.
- Visual regression check for overflow/layout integrity.

### References

- [Source: `_bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation`] — shadcn/ui + Magic UI stack
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`] — component organization and naming

---

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Story created via `.claude/skills/bmad-create-story` workflow

### Completion Notes List

- Ordered second to establish stable navigation structure before advanced actions and modal tooling.

### File List

- _bmad-output/implementation-artifacts/5-9-collapsible-mail-navigation-sidebar.md
