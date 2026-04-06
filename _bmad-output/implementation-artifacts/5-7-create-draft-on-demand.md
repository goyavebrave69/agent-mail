# Story 5.7: Create Draft On Demand

Status: review

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

- [x] Add create-on-demand Server Action in `app/(app)/inbox/[emailId]/actions.ts` (AC: 1, 2, 3)
  - [x] Add `createDraftOnDemand(emailId: string)` result type and action implementation
  - [x] Authenticate user, verify email ownership, and block create when draft is already `generating` or `ready`
  - [x] Upsert/create draft in `generating` state with reset fields (`content`, `confidence_score`, `error_message`)
  - [x] Invoke `generate-draft` Edge Function asynchronously and handle startup failures
  - [x] Revalidate `/inbox` and `/inbox/[emailId]` paths on action completion

- [x] Add optimistic UI support in `stores/draft-store.ts` and `components/draft/draft-section.tsx` (AC: 1, 2)
  - [x] Add local state/actions to represent create-draft-in-progress and related error
  - [x] Show generating placeholder immediately after user action
  - [x] Keep state consistent with Realtime updates (clear optimistic state when draft transitions to `ready` or `error`)

- [x] Update draft empty state UI to expose create action (AC: 1)
  - [x] In `components/draft/draft-section.tsx`, replace passive "No draft available yet." view with CTA button
  - [x] Add loading/disabled behavior while create action is running
  - [x] Keep existing architecture style and avoid adding new global state domains

- [x] Add tests for server action and UI behavior (AC: 1, 2, 3)
  - [x] Add action tests in `app/(app)/inbox/[emailId]/actions.test.ts`:
  - [x] creates generating draft and invokes edge function
  - [x] prevents duplicate generation when draft already exists in `generating`/`ready`
  - [x] returns error and writes draft `error` state when invoke fails
  - [x] Add component tests for empty-state CTA and optimistic transition in draft UI

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

claude-sonnet-4-6

### Debug Log References

- `DraftRealtime` accepts `draftId: string | null` — when null, it listens for ALL draft inserts/updates for the user. This allows the empty state to receive realtime notifications for a newly created draft without needing `router.refresh()`.
- `initialDraft` is synced into local `draft` state via `useEffect` so that SSR re-renders (after `revalidatePath`) propagate to the component.
- `createDraftOnDemand` upserts: if draft exists in non-generating/ready state, it resets it to generating with cleared fields; if no draft exists, inserts a new row.

### Completion Notes List

- Added `CreateDraftResult` interface and `createDraftOnDemand(emailId)` server action with full branching: auth check, email ownership, duplicate prevention (`generating`/`ready`), upsert to generating, edge function invoke, error state write on failure.
- Added `isCreating`, `createError` state + `startCreating`/`failCreating`/`clearCreating` actions to Zustand store.
- Replaced passive empty-state div in `DraftSection` with `Create Draft` CTA button; shows `GeneratingSkeleton` immediately when `isCreating` is true.
- `DraftRealtime` rendered with `draftId={null}` in empty state so that newly created drafts are detected via Realtime without requiring a page refresh.
- `handleDraftUpdate` clears creating state when draft reaches `ready` or `error`.
- All 195 tests pass; typecheck and lint clean.

### File List

- `_bmad-output/implementation-artifacts/5-7-create-draft-on-demand.md`
- `app/(app)/inbox/[emailId]/actions.ts`
- `app/(app)/inbox/[emailId]/actions.test.ts`
- `stores/draft-store.ts`
- `stores/draft-store.test.ts`
- `components/draft/draft-section.tsx`
- `components/draft/draft-section.test.tsx`

### Change Log

- Added `createDraftOnDemand` server action with duplicate prevention and error state write-back (Date: 2026-04-02)
- Added `isCreating`/`createError` state to Zustand draft store with 3 new actions (Date: 2026-04-02)
- Replaced passive empty state in DraftSection with Create Draft CTA and optimistic generating skeleton (Date: 2026-04-02)
