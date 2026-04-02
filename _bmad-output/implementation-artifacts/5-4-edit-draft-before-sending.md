# Story 5.4: Edit Draft Before Sending

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** to manually edit a draft before sending it,
**So that** I can correct or personalize the AI's reply when needed.

---

## Acceptance Criteria

**Given** the user modifies text in the draft editor (Client Component, Zustand-powered)
**When** they type
**Then** the edited content is tracked in `useDraftStore` without triggering a server call
**And** the "Send" button remains active on the edited content

**Given** the user clicks "Send" after editing
**When** the Server Action executes
**Then** the edited version is sent (not the original AI draft)
**And** the draft status is updated to `sent`

---

## Technical Requirements

### 1. Enhanced Draft Store: `stores/draft-store.ts`

Update existing store from Story 5-2 with editing capabilities.

```typescript
interface DraftStore {
  // Existing state
  activeDraftId: string | null
  draftContent: string        // Original AI-generated content (immutable)
  status: DraftStatus
  
  // Editing state
  isEditing: boolean
  editedContent: string       // User's edited version
  hasUnsavedChanges: boolean
  
  // UI state
  isSending: boolean
  sendError: string | null
  
  // Actions
  setActiveDraft: (draftId: string | null, content: string, status: DraftStatus) => void
  
  // Editing actions
  startEditing: () => void
  updateEditedContent: (content: string) => void
  saveEdit: () => void        // Confirm edit, update draftContent
  cancelEditing: () => void    // Discard changes, revert to draftContent
  
  // Send actions
  optimisticSend: () => void
  confirmSend: () => void
  failSend: (error: string) => void
  
  // Reset
  reset: () => void
}
```

**Implementation details:**
- `startEditing`: Set `isEditing = true`, initialize `editedContent` with current `draftContent`
- `updateEditedContent`: Update `editedContent`, set `hasUnsavedChanges = true`
- `saveEdit`: Update `draftContent = editedContent`, keep `isEditing = true` or set to `false`
- `cancelEditing`: Revert `editedContent = draftContent`, set `isEditing = false`, `hasUnsavedChanges = false`

**State flow:**
```
View mode → [Edit button] → Edit mode (editedContent = draftContent copy)
  ↓                              ↓
  ← [Cancel] ← Discard changes — [Type] → Track changes
              ↓
         [Save] → Update draftContent
              ↓
         [Send] → Send editedContent
```

### 2. Editable Draft Editor: `components/draft/draft-editor.tsx`

Update existing component from Story 5-2 with editing UI.

```typescript
interface DraftEditorProps {
  draftId: string
  initialContent: string
  status: DraftStatus
  confidenceScore: number | null
  errorMessage: string | null
}
```

**View mode (isEditing = false):**
- Display draft content in read-only styled container
- Show "Edit" button to enter edit mode
- Show "Validate & Send" button (sends original draft)

**Edit mode (isEditing = true):**
- Display textarea with `editedContent`
- Auto-resize textarea to fit content
- Show character count (e.g., "245 characters")
- Show action buttons:
  - "Save" (primary) — saves edits, stays in edit mode
  - "Cancel" (ghost) — discards changes, returns to view mode
  - "Send" (primary) — sends edited content directly

**Key behaviors:**
- Tab key inserts spaces, not changes focus
- Auto-save debounced (optional enhancement)
- Exit confirmation if unsaved changes and user tries to navigate away

### 3. Draft Editor Toolbar: `components/draft/draft-editor-toolbar.tsx`

New component. Toolbar for formatting actions (optional V1 scope).

```typescript
interface DraftEditorToolbarProps {
  onBold?: () => void
  onItalic?: () => void
  disabled?: boolean
}
```

**V1 scope:** Simple text editing only (no formatting toolbar)
**Future:** Bold, italic, bullet points via markdown or rich text editor

### 4. Update Draft Server Action: `app/(app)/inbox/[emailId]/actions.ts`

Add new Server Action for saving draft edits to database.

```typescript
export async function updateDraftContent(
  draftId: string, 
  newContent: string
): Promise<{ success: boolean; error?: string }>
```

**Workflow:**
1. Authenticate user
2. Verify draft belongs to user (RLS)
3. Verify draft status is `ready` (can't edit sent/rejected drafts)
4. Update `content` column with new text
5. Update `updated_at` timestamp
6. Return success

**Validation:**
- Max length: 10000 characters (prevents abuse)
- Min length: 1 character (non-empty)
- Strip HTML (plain text only in V1)

### 5. Edit-Aware Send Action: `app/(app)/inbox/[emailId]/actions.ts`

Update `validateAndSendDraft` from Story 5-3:

```typescript
export async function validateAndSendDraft(
  draftId: string,
  editedContent?: string  // Optional: user's edited version
): Promise<SendDraftResult>
```

**Logic:**
- If `editedContent` provided and different from stored draft → send edited version
- If no `editedContent` or matches stored draft → send original draft
- Always use the most recent content

### 6. Character Counter Component: `components/draft/character-counter.tsx`

New utility component.

```typescript
interface CharacterCounterProps {
  count: number
  max?: number
  warningAt?: number  // Default: 80% of max
}
```

**UI:**
- Shows "X characters" in subtle text
- Changes color to amber near limit
- Changes color to red at/over limit

### 7. Unsaved Changes Warning

Browser navigation guard:

```typescript
// In draft-editor.tsx (Client Component)
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [hasUnsavedChanges])
```

### 8. Draft Actions Component Update

Update `components/draft/draft-actions.tsx` with edit-aware buttons:

```typescript
export function DraftActions({ draftId, emailId, status }: DraftActionsProps) {
  const store = useDraftStore()
  const { isEditing, editedContent, draftContent, hasUnsavedChanges } = store
  
  // In edit mode
  if (isEditing) {
    return (
      <div className="draft-actions editing">
        <CharacterCounter count={editedContent.length} max={10000} />
        
        <Button onClick={() => store.cancelEditing()} variant="ghost">
          Cancel
        </Button>
        
        <Button 
          onClick={() => store.saveEdit()} 
          variant="secondary"
          disabled={!hasUnsavedChanges}
        >
          Save
        </Button>
        
        <Button 
          onClick={async () => {
            const contentToSend = hasUnsavedChanges ? editedContent : draftContent
            store.optimisticSend()
            const result = await validateAndSendDraft(draftId, contentToSend)
            // ... handle result
          }}
          variant="primary"
        >
          Send
        </Button>
      </div>
    )
  }
  
  // In view mode (from Story 5-3)
  return (
    <div className="draft-actions">
      <Button onClick={() => store.startEditing()} variant="outline">
        Edit
      </Button>
      <Button onClick={handleValidateAndSend} variant="primary">
        Validate & Send
      </Button>
      {/* ... regenerate, reject buttons */}
    </div>
  )
}
```

### 9. Draft Editor Tests: `components/draft/draft-editor.test.tsx`

Update tests from Story 5-2.

**Required test cases:**
1. Clicking "Edit" button switches to edit mode with textarea
2. Typing in textarea updates `editedContent` in store
3. Character counter updates with typed content
4. Clicking "Save" persists edits to database
5. Clicking "Cancel" reverts to original content
6. Clicking "Send" in edit mode sends edited content
7. Navigation warning appears when unsaved changes exist
8. Cannot edit drafts with status `sent` or `rejected`

### 10. Store Tests: `stores/draft-store.test.ts`

Update tests from Story 5-2.

**Required test cases:**
1. `startEditing` copies `draftContent` to `editedContent`
2. `updateEditedContent` updates text and sets `hasUnsavedChanges`
3. `saveEdit` updates `draftContent` with `editedContent`
4. `cancelEditing` reverts `editedContent` to `draftContent`
5. `hasUnsavedChanges` correctly tracks modified state

---

## File Locations

| File | Action |
|------|--------|
| `stores/draft-store.ts` | Update with editing state and actions |
| `stores/draft-store.test.ts` | Add tests for editing actions |
| `components/draft/draft-editor.tsx` | Update with edit mode UI |
| `components/draft/draft-editor.test.tsx` | Add tests for editing |
| `components/draft/draft-actions.tsx` | Update with edit-aware buttons |
| `components/draft/character-counter.tsx` | New character counter utility |
| `app/(app)/inbox/[emailId]/actions.ts` | Add `updateDraftContent` action |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **No server calls while typing:** All editing is local in Zustand until Save or Send.
- **Immutable original:** Keep `draftContent` as original AI draft; `editedContent` for user modifications.
- **Clear state machine:** View → Edit → (Save/Cancel/Send) transitions must be predictable.
- **Unsaved changes guard:** Prevent accidental navigation with browser `beforeunload` handler.

### Edit Mode State Machine

```
           [Edit button]
View ─────────────────→ Edit
  ↑                      │
  │                      ├──[Type]→ Track changes
  │                      │
  │                      ├──[Cancel]→ Discard
  │                      │
  │                      ├──[Save]→ Persist (stay in Edit)
  │                      │
  │                      └──[Send]→ Send edited, go to Sent
  │
  └──────────────────────┘
```

### UX Guidelines

- Auto-focus textarea when entering edit mode
- Show clear visual distinction between view and edit modes
- Disable Send if content is empty
- Enable Save only when changes exist (prevents unnecessary calls)

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 5-1: Asynchronous Draft Generation Pipeline — drafts table exists
- Story 5-2: Draft View with Confidence Score — draft editor base component
- Story 5-3: Validate & Send Draft — send action exists

**Related ongoing work:**
- Story 5-5: Regenerate Draft — will add "Regenerate" button to same actions area
- Story 5-6: Reject Draft — will add "Reject" button

---

## Context from Previous Stories

**Store pattern with editing:**
```typescript
// Track both original and edited content
interface DraftStore {
  draftContent: string     // Original AI draft
  editedContent: string    // User's working copy
  isEditing: boolean
}

// Enter edit mode
startEditing: () => set(state => ({
  isEditing: true,
  editedContent: state.draftContent,
  hasUnsavedChanges: false
}))
```

**Server Action pattern:**
```typescript
// Optional parameter for edited content
export async function validateAndSendDraft(
  draftId: string,
  editedContent?: string
): Promise<SendDraftResult> {
  // Use editedContent if provided, else fetch from DB
  const contentToSend = editedContent ?? await fetchDraftContent(draftId)
  // ... send logic
}
```

---

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- `npm test`
- `npm run lint`
- `npm run typecheck`

### Completion Notes List

- Extended the draft store to track immutable draft content, editable content, draft status, and unsaved changes while keeping typing fully local in Zustand.
- Added explicit draft edit persistence through `updateDraftContent`, plus edit-aware send handling so the latest edited text is what gets sent and stored when a draft is validated.
- Updated the draft editor/actions flow with edit mode controls, character counting, tab insertion in the textarea, focus handling, and a browser `beforeunload` warning for unsaved changes.
- Expanded automated coverage for draft editing state transitions, edit-mode component behavior, and the new save/send server action paths.

### File List

- _bmad-output/implementation-artifacts/5-4-edit-draft-before-sending.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/(app)/inbox/[emailId]/actions.ts
- app/(app)/inbox/[emailId]/actions.test.ts
- components/draft/character-counter.tsx
- components/draft/draft-actions.tsx
- components/draft/draft-actions.test.tsx
- components/draft/draft-editor.tsx
- components/draft/draft-editor.test.tsx
- components/draft/draft-section.tsx
- stores/draft-store.ts
- stores/draft-store.test.ts

### Change Log

- 2026-04-01: Implemented draft editing workflow, save action, edit-aware sending, and related tests.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.4 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Zustand patterns, state management
- [Source: `_bmad-output/implementation-artifacts/5-2-draft-view-with-confidence-score.md`] — Draft store base implementation
- [Source: `_bmad-output/implementation-artifacts/5-3-validate-and-send-draft.md`] — Send action implementation
