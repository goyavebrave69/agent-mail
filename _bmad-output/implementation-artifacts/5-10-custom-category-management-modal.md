# Story 5.10: Custom Category Management Modal

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** a button that opens a modal to create custom email categories,  
**so that** I can define my own sorting taxonomy beyond default categories.

---

## Acceptance Criteria

**Given** the user is in inbox shell  
**When** they click `Manage Categories`  
**Then** a modal opens and allows creating a custom category name.

**Given** a category name is valid and not duplicated for the same user  
**When** user confirms creation  
**Then** the category is persisted  
**And** appears in category-based sorting/filter UI.

**Given** user tries an invalid category name (empty, too long, duplicate)  
**When** form is submitted  
**Then** inline validation prevents submission and shows clear error messaging.

---

## Tasks / Subtasks

- [ ] Add data model + server mutation path for custom categories (AC: 1, 2, 3)
  - [ ] Introduce table/migration for user-scoped custom categories (RLS protected)
  - [ ] Add Server Action to create category with normalization and duplicate checks
- [ ] Add modal UI entrypoint in inbox shell (AC: 1, 2, 3)
  - [ ] Add `Manage Categories` button in inbox interface
  - [ ] Implement modal with shadcn `Dialog`, input, and validation states
- [ ] Connect categories to inbox sorting/filter rendering (AC: 2)
  - [ ] Include custom categories in list grouping/filter controls
  - [ ] Keep compatibility with fixed system categories
- [ ] Add tests for validation and persistence (AC: 2, 3)

---

## Dev Notes

- Reuse existing category handling constants where possible; avoid replacing system categories.
- Keep custom categories user-scoped and RLS-safe.
- **UI requirement:** implement modal and form with `shadcn/ui` components (`Dialog`, `Input`, `Button`, `Form` patterns).
- **Documentation requirement:** use MCP to retrieve latest docs for shadcn dialog/form patterns and Supabase RLS migration references before implementation.

### Relevant Existing Files

- `components/inbox/inbox-shell.tsx`
- `components/inbox/inbox-list.tsx`
- `app/(app)/inbox/page.tsx`
- `supabase/migrations/*`

### Architecture Compliance

- UI mutations must flow through co-located Server Actions.
- Follow database naming conventions (`snake_case`, RLS policy naming).
- No client-side direct DB writes.

### Testing Requirements

- Unit tests for category creation action and validation.
- Component tests for modal open/close and error states.
- Regression tests for category grouping render with both system and custom categories.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#FR Coverage Map`] — FR13 filtering behavior
- [Source: `_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions`] — RLS + Server Action patterns
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`] — DB and file organization rules

---

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Story created via `.claude/skills/bmad-create-story` workflow

### Completion Notes List

- Ordered after sidebar/search so category management lands on stabilized inbox IA.

### File List

- _bmad-output/implementation-artifacts/5-10-custom-category-management-modal.md
