# Story 5.5: Regenerate Draft with Instruction

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** to request a new draft with an optional instruction,
**So that** I can guide the AI when the first draft doesn't fit my needs.

---

## Acceptance Criteria

**Given** the user clicks "Regenerate" and optionally types an instruction (e.g., "offer a 24h delay")
**When** the regeneration Server Action is triggered
**Then** the existing draft is replaced with a new generation request (status → `generating`)
**And** the instruction is passed to the LLM as additional context alongside the KB chunks
**And** the new draft appears within 10 seconds (NFR2) and the confidence score is updated

**Given** the user clicks "Regenerate" without any instruction
**When** the action executes
**Then** a new draft is generated with the same KB context as the original

---

## Technical Requirements

### 1. Regenerate Instruction Modal: `components/draft/regenerate-modal.tsx`

New file. Modal for entering optional regeneration instructions.

```typescript
interface RegenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (instruction: string | null) => void
  isLoading: boolean
}
```

**UI Design:**
- Title: "Regenerate Draft"
- Subtitle: "Add optional instructions to guide the AI (e.g., 'mention our holiday hours', 'be more formal')"
- Textarea for instruction input (placeholder: "Optional instructions...")
- Character limit: 200 characters
- Buttons:
  - "Cancel" (ghost) — close modal without regenerating
  - "Regenerate without instructions" (outline) — submit with null instruction
  - "Regenerate with instructions" (primary) — submit with entered text

**UX behaviors:**
- Auto-focus textarea when modal opens
- Escape key closes modal
- Click outside closes modal (with confirmation if text entered)
- Loading state shows spinner on confirm buttons

### 2. Update Draft Store: `stores/draft-store.ts`

Add regeneration state tracking.

```typescript
interface DraftStore {
  // ... existing state from Stories 5-2, 5-3, 5-4
  
  // Regeneration state
  isRegenerating: boolean
  regenerateError: string | null
  showRegenerateModal: boolean
  
  // Regeneration actions
  openRegenerateModal: () => void
  closeRegenerateModal: () => void
  optimisticRegenerate: () => void
  confirmRegenerate: () => void
  failRegenerate: (error: string) => void
}
```

**Implementation:**
- `openRegenerateModal`: Set `showRegenerateModal = true`
- `optimisticRegenerate`: Set `isRegenerating = true`, close modal, reset `draftContent` to placeholder
- `confirmRegenerate`: Set `isRegenerating = false`, update with new draft content
- `failRegenerate`: Set `isRegenerating = false`, set `regenerateError`

### 3. Regenerate Server Action: `app/(app)/inbox/[emailId]/actions.ts`

New Server Action for requesting draft regeneration.

```typescript
export interface RegenerateDraftResult {
  success: boolean
  error?: string
}

export async function regenerateDraft(
  draftId: string,
  instruction: string | null
): Promise<RegenerateDraftResult>
```

**Workflow:**
1. Authenticate user via Supabase
2. Fetch current draft and verify ownership (RLS)
3. Verify draft status is `ready` or `error` (can regenerate from error state)
4. Update draft status to `generating`
5. Clear previous `content`, `confidence_score`, `error_message`
6. Invoke `generate-draft` Edge Function with:
   - `emailId`
   - `userId`
   - `instruction` (optional user guidance)
   - `isRegeneration: true` (flag for tracking)
7. Return success (Edge Function handles async generation)

**Edge Function invocation:**
```typescript
// Trigger async regeneration
const { error } = await supabase.functions.invoke('generate-draft', {
  body: {
    emailId: draft.email_id,
    userId: user.id,
    instruction: instruction?.trim() || null,
    isRegeneration: true,
  }
})

if (error) {
  // Revert status to error
  await supabase
    .from('drafts')
    .update({ 
      status: 'error',
      error_message: `Failed to start regeneration: ${error.message}`
    })
    .eq('id', draftId)
  
  return { success: false, error: error.message }
}

return { success: true }
```

### 4. Update Generate-Draft Edge Function

Update `supabase/functions/generate-draft/index.ts` from Story 5-1.

**Request body schema:**
```typescript
interface GenerateDraftRequest {
  emailId: string
  userId: string
  instruction?: string | null  // NEW: Optional user instruction
  isRegeneration?: boolean    // NEW: Flag for analytics
}
```

**Prompt construction with instruction:**
```typescript
// In generate-draft Edge Function
function buildDraftPrompt(
  emailContext: EmailMetadata,
  kbChunks: KbChunk[],
  userPreferences: UserPreferences,
  instruction?: string | null
): string {
  let prompt = `You are an email assistant. Draft a reply to this email:

From: ${emailContext.from}
Subject: ${emailContext.subject}

Use the following knowledge base information to draft an accurate response:
${kbChunks.map(c => `- ${c.content}`).join('\n')}

Tone: ${userPreferences.tone}
Language: ${userPreferences.language}
`

  // Add user instruction if provided
  if (instruction) {
    prompt += `\nAdditional instruction from user: ${instruction}\n`
  }

  prompt += `\nDraft a professional reply:`
  
  return prompt
}
```

**Analytics tracking (optional):**
- Log regeneration events with instruction length (not content, for privacy)
- Track regeneration success rate vs. original generation

### 5. Draft Actions Component Update

Update `components/draft/draft-actions.tsx` with regenerate button.

```typescript
export function DraftActions({ draftId, status }: DraftActionsProps) {
  const store = useDraftStore()
  const { isRegenerating, showRegenerateModal } = store
  
  const handleRegenerate = async (instruction: string | null) => {
    store.optimisticRegenerate()
    
    const result = await regenerateDraft(draftId, instruction)
    
    if (!result.success) {
      store.failRegenerate(result.error || 'Regeneration failed')
    }
    // Success: Wait for Realtime update when draft becomes ready
  }
  
  return (
    <>
      <div className="draft-actions">
        {/* ... other buttons from Stories 5-3, 5-4 */}
        
        <Button
          onClick={() => store.openRegenerateModal()}
          disabled={status === 'generating' || isRegenerating}
          variant="outline"
          icon={<SparklesIcon />}  // Magic UI sparkle animation
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </Button>
      </div>
      
      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={() => store.closeRegenerateModal()}
        onConfirm={handleRegenerate}
        isLoading={isRegenerating}
      />
    </>
  )
}
```

### 6. Migration: Add `regeneration_count` to drafts table

New migration `017_drafts_regeneration.sql`:

```sql
-- Track regeneration attempts for analytics
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS regeneration_count INTEGER NOT NULL DEFAULT 0;

-- Add instruction column (optional - can pass via Edge Function only)
-- If we want to persist the instruction that led to current draft:
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS generation_instruction TEXT;
```

**Update logic:**
- Increment `regeneration_count` on each regeneration request
- Store `generation_instruction` so user can see what guided current draft

### 7. Realtime Handling for Regeneration

The existing Realtime subscription from Story 5-2 automatically handles regeneration:

```typescript
// In draft-realtime.tsx (already exists)
// When draft transitions generating → ready:
// - Update draftContent with new content
// - Update confidenceScore
// - Clear isRegenerating state
```

**Status transitions during regeneration:**
1. User clicks "Regenerate" → status: `ready` → `generating`
2. Edge Function processes → Realtime updates client
3. Draft ready → status: `generating` → `ready`
4. UI shows new content and updated confidence score

### 8. Empty Instruction Handling

When user clicks "Regenerate without instructions":
- Pass `instruction: null` to Server Action
- LLM prompt excludes instruction section
- Generation proceeds with same KB context as original

### 9. Regeneration Limiting (Optional)

Prevent abuse by limiting regenerations:

```typescript
// In regenerateDraft Server Action
const MAX_REGENERATIONS = 5

const { data: draft } = await supabase
  .from('drafts')
  .select('regeneration_count')
  .eq('id', draftId)
  .single()

if (draft.regeneration_count >= MAX_REGENERATIONS) {
  return { 
    success: false, 
    error: 'Maximum regeneration limit reached for this draft' 
  }
}
```

### 10. Regenerate Modal Tests: `components/draft/regenerate-modal.test.tsx`

**Required test cases:**
1. Opens with textarea focused
2. Shows character count as user types
3. Clicking "Regenerate without instructions" calls onConfirm with null
4. Clicking "Regenerate with instructions" calls onConfirm with entered text
5. Disables confirm buttons when loading
6. Closes on Cancel click
7. Trims whitespace from instruction

### 11. Regenerate Action Tests

**Required test cases:**
1. Updates draft status to `generating` on success
2. Invokes generate-draft Edge Function with correct payload
3. Includes instruction when provided
4. Handles null/empty instruction correctly
5. Returns error when draft not found
6. Increments regeneration_count

---

## File Locations

| File | Action |
|------|--------|
| `components/draft/regenerate-modal.tsx` | New modal for regeneration instructions |
| `components/draft/regenerate-modal.test.tsx` | Tests for regenerate modal |
| `stores/draft-store.ts` | Add regeneration state and actions |
| `stores/draft-store.test.ts` | Add regeneration tests |
| `app/(app)/inbox/[emailId]/actions.ts` | Add `regenerateDraft` Server Action |
| `supabase/functions/generate-draft/index.ts` | Update to handle `instruction` parameter |
| `supabase/migrations/017_drafts_regeneration.sql` | Add regeneration_count column |
| `components/draft/draft-actions.tsx` | Add regenerate button |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **Async regeneration:** Fire-and-forget to Edge Function, use Realtime for completion.
- **Instruction passing:** Forward user instruction to LLM prompt contextually.
- **Status reset:** Clear previous content/confidence when entering `generating` state.
- **Error recovery:** If regeneration fails, draft returns to `error` state with message.

### Regeneration Flow State Machine

```
ready ──[Regenerate btn]──→ regenerating (optimistic)
  ↑                           │
  │                           ├── Edge Function invoked
  │                           │
  └──success──────────────────┘
  │
error ←──failure (error_message populated)
```

### UX Guidelines

- Preserve modal input if user accidentally closes (optional enhancement)
- Show clear loading state during regeneration
- Animate transition when new draft appears
- Allow regeneration from error state (retry with guidance)

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 5-1: Asynchronous Draft Generation Pipeline — Edge Function exists
- Story 5-2: Draft View with Confidence Score — Realtime updates, draft UI
- Story 5-3: Validate & Send Draft — action patterns
- Story 5-4: Edit Draft Before Sending — draft store structure

**Related ongoing work:**
- Story 5-6: Reject Draft — will complete the draft actions

---

## Context from Previous Stories

**Pattern for Edge Function invocation:**
```typescript
// From Story 5-1
const { data, error } = await supabase.functions.invoke('generate-draft', {
  body: { emailId, userId }
})
```

**Pattern for prompt building:**
```typescript
// From Story 5-1 lib/ai/draft.ts
export async function generateDraft(
  emailSubject: string,
  kbChunks: Array<{ content: string; similarity: number }>,
  // ... options
): Promise<DraftGenerationResult>
```

**Pattern for status transitions:**
```typescript
// Draft status must flow: ready → generating → ready|error
await supabase
  .from('drafts')
  .update({ 
    status: 'generating',
    content: null,  // Clear old content
    confidence_score: null
  })
  .eq('id', draftId)
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

- Implemented regeneration instruction modal with optional guidance input, focus management, escape/overlay close behavior, and loading-safe actions.
- Extended draft state management with regeneration flags and modal state (`isRegenerating`, `regenerateError`, `showRegenerateModal`) plus optimistic/confirm/fail regeneration transitions.
- Added `regenerateDraft` Server Action that validates ownership/status, enforces a regeneration limit, increments regeneration metadata, switches draft state to `generating`, and invokes `generate-draft` asynchronously.
- Updated draft UI flow so regenerate runs through modal confirmation and realtime completion, with visible regeneration error feedback when the invocation fails.
- Updated `generate-draft` Edge Function to accept and sanitize optional user instruction and pass it into draft prompt generation.
- Added schema migration for `regeneration_count` and `generation_instruction`, and expanded automated coverage for modal behavior, store regeneration transitions, and regeneration action paths.

### File List

- _bmad-output/implementation-artifacts/5-5-regenerate-draft-with-instruction.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/(app)/inbox/[emailId]/actions.ts
- app/(app)/inbox/[emailId]/actions.test.ts
- components/draft/draft-actions.tsx
- components/draft/draft-actions.test.tsx
- components/draft/draft-editor.tsx
- components/draft/draft-editor.test.tsx
- components/draft/draft-section.tsx
- components/draft/regenerate-modal.tsx
- components/draft/regenerate-modal.test.tsx
- stores/draft-store.ts
- stores/draft-store.test.ts
- supabase/functions/generate-draft/index.ts
- supabase/migrations/017_drafts_regeneration.sql
- types/draft.ts

### Change Log

- 2026-04-01: Implemented story 5.5 regeneration flow with optional instruction modal, server action updates, edge-function instruction handling, migration, and tests.

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.5 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Edge Function patterns, Server Actions
- [Source: `_bmad-output/implementation-artifacts/5-1-asynchronous-draft-generation-pipeline.md`] — generate-draft Edge Function
- [Source: `_bmad-output/implementation-artifacts/5-2-draft-view-with-confidence-score.md`] — Realtime subscription pattern
