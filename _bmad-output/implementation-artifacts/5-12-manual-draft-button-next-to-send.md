# Story 5.12: Manual Draft Button Next To Send

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** a `Create Draft` button next to `Send` in the reply composer,  
**so that** I can manually generate a draft response whenever I choose.

---

## Acceptance Criteria

**Given** a selected email in inbox reading pane  
**When** user clicks `Create Draft` next to `Send`  
**Then** a manual draft generation flow starts and shows immediate in-progress feedback.

**Given** a draft is generated successfully  
**When** generation completes  
**Then** draft content appears in the composer without leaving the inbox page.

**Given** generation fails or is already in progress  
**When** user clicks `Create Draft`  
**Then** duplicate requests are prevented and clear feedback is shown.

---

## Tasks / Subtasks

- [ ] Add `Create Draft` control in reply composer footer (AC: 1, 2, 3)
  - [ ] Place button directly next to existing `Send` action
  - [ ] Add loading/disabled state during generation
- [ ] Reuse existing manual generation backend flow (AC: 1, 3)
  - [ ] Integrate with create-on-demand draft action/pipeline (`5-7`)
  - [ ] Keep single-active-generation guard per email
- [ ] Bind composer content to generated draft result (AC: 2)
  - [ ] Hydrate composer when draft transitions to ready
  - [ ] Preserve user edits when appropriate
- [ ] Add tests for happy path and duplicate/error cases (AC: 2, 3)

---

## Dev Notes

- Story depends on existing draft generation pipeline from stories 5-1 and 5-7.
- Keep generation asynchronous and non-blocking in UI.
- **UI requirement:** use `shadcn/ui` buttons and form controls for the composer actions row.
- **Documentation requirement:** query MCP docs for current Supabase Realtime + Next.js Server Actions interaction patterns before coding.

### Relevant Existing Files

- `components/inbox/inbox-shell.tsx`
- `app/(app)/inbox/[emailId]/actions.ts`
- `components/draft/draft-section.tsx`
- `stores/draft-store.ts`

### Architecture Compliance

- No direct client-to-LLM calls.
- Keep mutations in Server Actions and state sync via Realtime.
- Preserve no-redirect inbox reading/composer flow.

### Testing Requirements

- Component tests for `Create Draft` visibility and interaction next to `Send`.
- Action tests for duplicate prevention and error fallback.
- End-to-end check that generated draft appears in composer.

### References

- [Source: `_bmad-output/implementation-artifacts/5-7-create-draft-on-demand.md`] — existing on-demand draft behavior and safeguards
- [Source: `_bmad-output/planning-artifacts/epics.md#FR Coverage Map`] — FR16, FR18, FR21, FR23 alignment
- [Source: `_bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions`] — async pipeline and Server Actions rules

---

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Story created via `.claude/skills/bmad-create-story` workflow

### Completion Notes List

- Ordered last because it builds on action wiring and existing draft-generation safeguards.

### File List

- _bmad-output/implementation-artifacts/5-12-manual-draft-button-next-to-send.md
