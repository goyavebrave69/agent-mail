# Story 5.9: Collapsible Mail Navigation Sidebar

Status: review

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

- [x] Implement collapsible sidebar behavior in `components/inbox/inbox-shell.tsx` (AC: 1, 2, 3)
  - [x] Add collapse trigger and state handling
  - [x] Render primary and secondary navigation groups with separator
  - [x] Preserve responsive behavior across desktop sizes
- [x] Use shadcn sidebar primitives where relevant (AC: 1, 2)
  - [x] Reuse generated sidebar component patterns instead of custom reinvention
- [x] Add interaction tests (AC: 1, 2, 3)
  - [x] Verify collapse/expand behavior
  - [x] Verify section ordering and separator rendering

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

claude-sonnet-4-6

### Debug Log References

- "Inbox" text appears in both the nav sidebar AND the email list panel header — tests use `getAllByText` for duplicate cases.
- Session persistence uses `sessionStorage` (not `localStorage`) to match the "same session" wording in AC3.
- Story 5-10 (Custom Category Management Modal) was implemented concurrently on the same branch; `inbox-shell.tsx` carries both stories' changes.

### Completion Notes List

- Replaced the 49px category icon rail with a collapsible `nav-sidebar` div (220px expanded / 49px collapsed) with `data-testid="nav-sidebar"` and `data-collapsed` attribute.
- Primary group: Inbox, Drafts, Sent, Trash — labels shown when expanded, icons only when collapsed, each with a tooltip.
- Separator (`shadcn/ui Separator`, `data-testid="nav-separator"`) between primary and secondary nav.
- Secondary group: category filters (existing CATEGORY_MENU) with same collapse behavior.
- `sidebarCollapsed` state initialized from `sessionStorage.getItem('inbox_sidebar_collapsed')`; persisted on every toggle.
- `PanelLeft` toggle button with `aria-label` switching between "Collapse sidebar" and "Expand sidebar".
- 11 sidebar-specific component tests in `inbox-sidebar.test.tsx` + 5 additional from story 5-10 (custom categories modal tests added to same file).
- 218 tests pass; typecheck and lint clean.

### File List

- _bmad-output/implementation-artifacts/5-9-collapsible-mail-navigation-sidebar.md
- components/inbox/inbox-shell.tsx
- components/inbox/inbox-sidebar.test.tsx

### Change Log

- Added collapsible nav sidebar with primary/secondary groups and session persistence (Date: 2026-04-07)
