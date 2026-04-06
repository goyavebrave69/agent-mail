# Story 5.8: Functional Inbox Search

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** the inbox search bar to work reliably across visible emails,  
**so that** I can quickly find messages by sender, subject, and content preview.

---

## Acceptance Criteria

**Given** the user types in the inbox search input  
**When** search text changes  
**Then** the email list updates in real time without page navigation  
**And** results are filtered by sender name, sender email, subject, and body preview text.

**Given** no email matches the search query  
**When** the filter is applied  
**Then** an empty-state message is shown in the list panel  
**And** the reading pane does not crash.

**Given** an email is currently selected and remains in filtered results  
**When** search updates  
**Then** the same email remains selected; otherwise first visible result is auto-selected.

---

## Tasks / Subtasks

- [x] Harden search behavior in `components/inbox/inbox-shell.tsx` (AC: 1, 2, 3)
  - [x] Ensure filtering fields include sender name/email, subject, and body preview
  - [x] Keep search case-insensitive and whitespace-trimmed
  - [x] Maintain stable selected-email behavior during filtering
- [x] Add tests for search interactions (AC: 1, 2, 3)
  - [x] Add component tests for query matching and empty state
  - [x] Add tests for selection retention and fallback auto-selection
- [x] Keep architecture compliance (AC: 1)
  - [x] No new route/page for search behavior
  - [x] Stay in existing inbox shell and state flow

---

## Dev Notes

- Use existing `inbox-shell.tsx` filtering pipeline; do not create duplicate search state in another component.
- Keep the current inbox no-redirection behavior (in-pane reading).
- **UI requirement:** use `shadcn/ui` primitives when new UI pieces are needed.
- **Documentation requirement:** before implementation, query MCP documentation for relevant Next.js App Router + shadcn/ui patterns and record short references in PR notes.

### Relevant Existing Files

- `components/inbox/inbox-shell.tsx`
- `app/(app)/inbox/page.tsx`

### Architecture Compliance

- Keep UI-initiated logic in the current client shell for filtering.
- Preserve App Router structure and existing page boundaries.
- Avoid editing global navbar behavior in this story.

### Testing Requirements

- Component tests for live filtering and empty state.
- Regression checks for selected email behavior while filtering.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#FR Coverage Map`] — FR12, FR13 (inbox view and filtering)
- [Source: `_bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation`] — shadcn/ui + App Router
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`] — component structure and consistency rules

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Both emails in filter tests must use unique `from_email` overrides; otherwise the `baseEmail` default (`alice@example.com`) causes cross-contamination when searching "alice".
- `from_name ?? from_email` (old) silently dropped `from_email` search when a name was present. Fixed by searching each field independently.

### Completion Notes List

- Extended `filteredEmails` useMemo in `inbox-shell.tsx` to search `senderName`, `senderEmail`, `subject`, and `bodyPreview` independently (case-insensitive, whitespace-trimmed).
- Selection retention behavior was already correct; no change needed.
- Added 12 component tests in `inbox-shell.test.tsx` covering: all-fields search, empty state, reading-pane safety, clear-to-restore, whitespace trim, auto-select, and selection retention/fallback.
- 207 tests pass; typecheck and lint clean.

### File List

- _bmad-output/implementation-artifacts/5-8-functional-inbox-search.md
- components/inbox/inbox-shell.tsx
- components/inbox/inbox-shell.test.tsx

### Change Log

- Extended inbox search to cover sender email and body preview (Date: 2026-04-06)
