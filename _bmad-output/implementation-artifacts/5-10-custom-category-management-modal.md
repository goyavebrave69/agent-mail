# Story 5.10: Custom Category Management Modal

Status: review

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

- [x] Add data model + server mutation path for custom categories (AC: 1, 2, 3)
  - [x] Introduce table/migration for user-scoped custom categories (RLS protected)
  - [x] Add Server Action to create category with normalization and duplicate checks
- [x] Add modal UI entrypoint in inbox shell (AC: 1, 2, 3)
  - [x] Add `Manage Categories` button in inbox interface
  - [x] Implement modal with shadcn `Dialog`, input, and validation states
- [x] Connect categories to inbox sorting/filter rendering (AC: 2)
  - [x] Include custom categories in list grouping/filter controls
  - [x] Keep compatibility with fixed system categories
- [x] Add tests for validation and persistence (AC: 2, 3)

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
- Added `custom_categories` table with RLS policies and unique per-user slug constraint.
- Added `createCustomCategoryAction` with server-side normalization, length checks, duplicate checks, and inbox revalidation.
- Added `Manage Categories` modal in `InboxShell` using shadcn `Dialog` patterns and inline validation/error states.
- Extended inbox category normalization/rendering to support user custom category filters while preserving system categories.
- Added focused tests for server action validation/persistence and modal open/close/error/success flows.

### File List

- _bmad-output/implementation-artifacts/5-10-custom-category-management-modal.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/(app)/inbox/actions.ts
- app/(app)/inbox/actions.test.ts
- app/(app)/inbox/page.tsx
- components/inbox/inbox-shell.tsx
- components/inbox/inbox-sidebar.test.tsx
- components/ui/dialog.tsx
- lib/inbox/custom-categories.ts
- supabase/migrations/018_custom_categories.sql

## Change Log

- 2026-04-06: Implemented custom category data model, server mutation path, inbox modal UI integration, category rendering updates, and validation/persistence test coverage for story 5.10.
