# Story 5.7: Create Draft On Demand

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,  
**I want** to manually create a draft when no draft exists yet,  
**so that** I can trigger the AI reply workflow without waiting for background sync timing.

---

## Acceptance Criteria

**Given** an email detail page has no draft yet  
**When** the user clicks `Create Draft`  
**Then** a server action creates or reuses a draft row and sets status to `generating`  
**And** the `generate-draft` Edge Function is invoked asynchronously with the current `emailId` and `userId`  
**And** the UI immediately shows a generating state (optimistic) and then updates via Realtime when ready  
**And** the draft appears within 10 seconds under normal conditions (NFR2)

**Given** the user clicks `Create Draft` multiple times quickly  
**When** the first request is already in progress  
**Then** duplicate generation is prevented (single active generation per email)  
**And** the user sees a safe message instead of triggering duplicate draft jobs

**Given** draft generation startup fails  
**When** Edge Function invocation returns an error  
**Then** draft status is set to `error` with a helpful message  
**And** the UI shows retry affordance using existing draft error-state behavior

---

## Tasks / Subtasks

- [ ] Add create-on-demand Server Action in `app/(app)/inbox/[emailId]/actions.ts` (AC: 1, 2, 3)
  - [ ] Add `createDraftOnDemand(emailId: string)` result type and action implementation
  - [ ] Authenticate user, verify email ownership, and block create when draft is already `generating` or `ready`
  - [ ] Upsert/create draft in `generating` state with reset fields (`content`, `confidence_score`, `error_message`)
  - [ ] Invoke `generate-draft` Edge Function asynchronously and handle startup failures
  - [ ] Revalidate `/inbox` and `/inbox/[emailId]` paths on action completion

- [ ] Add optimistic UI support in `stores/draft-store.ts` and `components/draft/draft-section.tsx` (AC: 1, 2)
  - [ ] Add local state/actions to represent create-draft-in-progress and related error
  - [ ] Show generating placeholder immediately after user action
  - [ ] Keep state consistent with Realtime updates (clear optimistic state when draft transitions to `ready` or `error`)

- [ ] Update draft empty state UI to expose create action (AC: 1)
  - [ ] In `components/draft/draft-section.tsx`, replace passive “No draft available yet.” view with CTA button
  - [ ] Add loading/disabled behavior while create action is running
  - [ ] Keep existing architecture style and avoid adding new global state domains

- [ ] Add tests for server action and UI behavior (AC: 1, 2, 3)
  - [ ] Add action tests in `app/(app)/inbox/[emailId]/actions.test.ts`:
  - [ ] creates generating draft and invokes edge function
  - [ ] prevents duplicate generation when draft already exists in `generating`/`ready`
  - [ ] returns error and writes draft `error` state when invoke fails
  - [ ] Add component tests for empty-state CTA and optimistic transition in draft UI

---

## Dev Notes

- Reuse existing async pipeline instead of building a new generation mechanism.
- Keep generation source of truth in `supabase/functions/generate-draft/index.ts`.
- Use current draft lifecycle conventions: `pending -> generating -> ready | error`.
- Follow existing Server Action style in `app/(app)/inbox/[emailId]/actions.ts`.
- Do not introduce client-side direct calls to LLM or credentials; all generation remains server-side (NFR10, NFR11).
- Preserve RLS ownership checks by always filtering with `user_id`.

### Relevant Existing Files

- `app/(app)/inbox/[emailId]/actions.ts`
- `app/(app)/inbox/[emailId]/actions.test.ts`
- `components/draft/draft-section.tsx`
- `components/draft/draft-editor.tsx`
- `components/draft/draft-realtime.tsx`
- `stores/draft-store.ts`
- `supabase/functions/generate-draft/index.ts`

### Architecture Compliance

- Keep co-located mutation logic in page-level `actions.ts` (App Router pattern).
- Keep optimistic local UI in Zustand and confirmation from Supabase Realtime.
- Keep draft generation asynchronous and non-blocking from UI perspective.
- Keep strict enum/status handling; no free-form status strings.

### Testing Requirements

- Unit test server action branching paths for success, duplicate prevention, and invoke error.
- Component test empty-state CTA interaction and immediate generating UI feedback.
- Ensure no regressions against existing draft actions (`validate/send`, `edit`, `regenerate`, `reject`).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#FR Coverage Map`] — FR16, FR18, FR23 context for draft generation behavior
- [Source: `_bmad-output/planning-artifacts/epics.md#NonFunctional Requirements`] — NFR2 generation timing expectation
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules`] — Server Action + structure rules
- [Source: `_bmad-output/implementation-artifacts/5-1-asynchronous-draft-generation-pipeline.md`] — existing generate-draft async pipeline
- [Source: `_bmad-output/implementation-artifacts/5-2-draft-view-with-confidence-score.md`] — realtime draft update behavior
- [Source: `_bmad-output/implementation-artifacts/5-5-regenerate-draft-with-instruction.md`] — async draft-trigger pattern and error handling

---

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Story created via `.claude/skills/bmad-create-story` workflow

### Completion Notes List

- New story created to support explicit user-triggered draft generation when no draft exists yet.
- Story intentionally reuses existing async draft pipeline and realtime update model.

### File List

- _bmad-output/implementation-artifacts/5-7-create-draft-on-demand.md
