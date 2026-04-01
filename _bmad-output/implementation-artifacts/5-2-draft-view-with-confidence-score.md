# Story 5.2: Draft View with Confidence Score

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** to see the AI-generated draft and its confidence score when I open an email,
**So that** I can immediately assess whether the draft is ready to send.

---

## Acceptance Criteria

**Given** the user opens an email that has a draft with status `ready`
**When** the email detail page loads (RSC)
**Then** the draft text is displayed in the draft editor
**And** the confidence score is shown as an animated badge (Magic UI confidence-badge)
**And** the draft actions (validate, edit, regenerate, reject) are all visible

**Given** the draft status is `generating`
**When** the user opens the email
**Then** a loading state is shown and a Supabase Realtime subscription on `drafts:{user_id}` updates the UI when ready

**Given** the draft status is `error`
**When** the user opens the email
**Then** an error message with a retry button is displayed — never a blank draft area

---

## Technical Requirements

### 1. Draft Store: `stores/draft-store.ts`

New file. Zustand store for draft UI state management.

```typescript
interface DraftStore {
  // Current draft being viewed/edited
  activeDraftId: string | null
  draftContent: string
  isEditing: boolean
  editedContent: string | null
  
  // UI state
  isGenerating: boolean
  generationError: string | null
  
  // Actions
  setActiveDraft: (draftId: string | null, content: string) => void
  startEditing: () => void
  updateEditedContent: (content: string) => void
  cancelEditing: () => void
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}
```

**Implementation notes:**
- Use `create` from `zustand`
- Persist only UI state, not draft data (comes from Realtime/DB)
- Support optimistic updates for immediate UI feedback

### 2. Confidence Badge Component: `components/draft/confidence-badge.tsx`

New file. Magic UI animated confidence score display.

```typescript
interface ConfidenceBadgeProps {
  score: number  // 0-100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}
```

**UI Design:**
- **90-100**: Green badge with checkmark, label "High confidence"
- **70-89**: Blue badge, label "Good confidence"
- **50-69**: Yellow/amber badge, label "Moderate confidence"
- **0-49**: Red/rose badge, label "Low confidence - review recommended"

**Animation:**
- Number counts up from 0 to score on mount (Magic UI number-ticker)
- Badge color transitions smoothly
- Pulse animation for low confidence scores

**Accessibility:**
- `aria-label` with full confidence description
- Sufficient color contrast for all score ranges

### 3. Draft Editor Component: `components/draft/draft-editor.tsx`

New file. Main draft display and editing interface.

```typescript
interface DraftEditorProps {
  draftId: string
  initialContent: string
  status: DraftStatus
  confidenceScore: number | null
  errorMessage: string | null
}
```

**States:**

**Ready state:**
- Display draft content in editable textarea
- Show confidence badge (if score available)
- Show action buttons: Validate & Send, Edit, Regenerate, Reject

**Generating state:**
- Show Magic UI loading skeleton in draft area
- Display "Generating draft..." with animated dots
- Disable all action buttons except Cancel (if applicable)
- Subtle pulse animation indicating active generation

**Error state:**
- Show error alert with `errorMessage`
- Display "Retry generation" button
- Show placeholder: "Draft generation failed. Click retry to regenerate."

**Editing state:**
- Switch textarea to active editing mode
- Track changes in `useDraftStore`
- Show character count
- Enable "Send" and "Cancel" buttons

### 4. Draft Actions Component: `components/draft/draft-actions.tsx`

New file. Action buttons for draft operations.

```typescript
interface DraftActionsProps {
  draftId: string
  status: DraftStatus
  onValidateAndSend: () => void
  onEdit: () => void
  onRegenerate: () => void
  onReject: () => void
}
```

**Button layout (horizontal on desktop, vertical stack on mobile):**
- Primary: "Validate & Send" (green, prominent)
- Secondary: "Edit" (outline)
- Secondary: "Regenerate" (outline with sparkle icon)
- Secondary: "Reject" (ghost, subtle)

**State handling:**
- All buttons disabled during `generating` state
- Show loading spinner on button during async actions
- Optimistic UI updates via Zustand

### 5. Email Detail Page Update: `app/(app)/inbox/[emailId]/page.tsx`

Update existing RSC page to integrate draft viewing.

**Data fetching:**
```typescript
// Fetch email metadata (already exists)
const email = await fetchEmail(emailId)

// Fetch draft for this email
const draft = await fetchDraftForEmail(emailId, userId)
```

**Draft fetch helper (new):**
```typescript
// app/(app)/inbox/[emailId]/actions.ts
export async function fetchDraftForEmail(emailId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data: draft, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('email_id', emailId)
    .eq('user_id', user.id)
    .single()
  
  // Return null if no draft exists (normal for new emails)
  if (error?.code === 'PGRST116') return null
  if (error) throw error
  
  return draft
}
```

**Page structure:**
```tsx
// Server Component
export default async function EmailDetailPage({ params }: Props) {
  const email = await fetchEmail(params.emailId)
  const draft = await fetchDraftForEmail(params.emailId)
  
  return (
    <div className="email-detail-layout">
      <EmailHeader email={email} />
      <DraftSection 
        draft={draft} 
        emailId={params.emailId}
      />
    </div>
  )
}
```

### 6. Real-time Draft Updates: `components/draft/draft-realtime.tsx`

New client component. Subscribes to Supabase Realtime for draft status changes.

```typescript
'use client'

interface DraftRealtimeProps {
  draftId: string | null
  onDraftUpdate: (draft: Draft) => void
}
```

**Implementation:**
- Subscribe to `drafts:{user_id}` channel on mount
- Filter events for current `draftId`
- Call `onDraftUpdate` when draft status changes
- Unsubscribe on unmount

**Status transitions to watch:**
- `generating` → `ready`: Update UI with new content and confidence
- `generating` → `error`: Show error state with message
- `ready` → `sent`: Remove from view or show confirmation

### 7. Draft Section Container: `components/draft/draft-section.tsx`

New file. Combines all draft components into cohesive section.

```typescript
interface DraftSectionProps {
  draft: Draft | null
  emailId: string
}
```

**Responsibilities:**
- Orchestrate draft-editor, confidence-badge, draft-actions, draft-realtime
- Manage local UI state via Zustand store
- Handle server action calls
- Provide optimistic updates

**Draft not found scenario:**
- Display "No draft available yet" placeholder
- Show "Generate draft" button (optional - usually auto-generated)

### 8. Draft Type Definitions: `types/draft.ts`

Update existing types file with complete Draft interface.

```typescript
export type DraftStatus = 'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'

export interface Draft {
  id: string
  userId: string
  emailId: string
  content: string | null
  status: DraftStatus
  confidenceScore: number | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}
```

### 9. Draft Store Tests: `stores/draft-store.test.ts`

**Required test cases:**
1. `setActiveDraft` updates store with correct draft ID and content
2. `startEditing` toggles editing mode and preserves original content
3. `updateEditedContent` updates edited content without affecting original
4. `cancelEditing` restores original content and exits editing mode
5. `setGenerating` and `setError` update UI state correctly
6. `reset` clears all state to initial values

### 10. Draft Component Tests: `components/draft/draft-editor.test.tsx`

**Required test cases:**
1. Renders draft content when status is `ready`
2. Shows confidence badge with correct color for high score
3. Shows loading skeleton when status is `generating`
4. Shows error message with retry button when status is `error`
5. Enters editing mode when Edit button clicked
6. Tracks edited content in textarea

---

## File Locations

| File | Action |
|------|--------|
| `stores/draft-store.ts` | New Zustand store for draft UI state |
| `stores/draft-store.test.ts` | Tests for draft store |
| `components/draft/confidence-badge.tsx` | Magic UI confidence score badge |
| `components/draft/confidence-badge.test.tsx` | Tests for confidence badge |
| `components/draft/draft-editor.tsx` | Main draft display/editor component |
| `components/draft/draft-editor.test.tsx` | Tests for draft editor |
| `components/draft/draft-actions.tsx` | Draft action buttons (validate, edit, regenerate, reject) |
| `components/draft/draft-actions.test.tsx` | Tests for draft actions |
| `components/draft/draft-realtime.tsx` | Realtime subscription for draft updates |
| `components/draft/draft-section.tsx` | Container combining all draft components |
| `app/(app)/inbox/[emailId]/actions.ts` | Add `fetchDraftForEmail` function |
| `app/(app)/inbox/[emailId]/page.tsx` | Update to fetch and display draft |
| `types/draft.ts` | Verify/update Draft type definitions |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **DraftStatus strict enum only:** Never use free strings. Always use `'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'` type.
- **Zustand for UI state only:** Draft data (content, status) comes from DB/Realtime; Zustand tracks UI state (editing, loading).
- **Never silent failures:** Error states must display clear messages with retry options.
- **Optimistic UI:** Update Zustand state immediately on user actions, sync with server response.
- **RLS enforcement:** All draft fetches respect RLS; users only see their own drafts.

### Component Conventions

- Draft components live in `/components/draft/` directory
- Co-located tests: `draft-editor.tsx` → `draft-editor.test.tsx`
- Client components marked with `'use client'` when using hooks/stores
- Server Components for initial data fetch (page.tsx)

### Magic UI Integration

- Use `number-ticker` animation for confidence score display
- Use `skeleton` for generating state loading
- Use `animated-beam` or similar for subtle generating indicator
- Maintain consistent animation durations (300-500ms)

### Realtime Patterns

- Channel name: `drafts:{user_id}` (established in architecture)
- Subscribe on component mount, unsubscribe on unmount
- Filter events by draft ID to avoid unnecessary re-renders
- Always have polling fallback (30s interval) if Realtime fails

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 5-1: Asynchronous Draft Generation Pipeline — drafts table, status tracking, and Edge Function must exist

**Related ongoing work:**
- Story 5-3 through 5-6 will add actions (validate, edit, regenerate, reject) that integrate with this UI

---

## Context from Previous Stories

**Architecture decisions already in place:**
- `drafts` table with status tracking exists (Story 5-1)
- `DraftStatus` enum defined in `types/draft.ts`
- Zustand pattern established (inbox-store exists in `/stores/`)
- Magic UI components available via `@/components/ui/*`
- Supabase Realtime channels configured for `drafts:{user_id}`

**Pattern for Zustand stores:**
```typescript
// stores/draft-store.ts pattern
import { create } from 'zustand'

interface DraftStore {
  // State
  // Actions
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  // Implementation
}))
```

**Pattern for Realtime subscriptions:**
```typescript
// Realtime subscription pattern
const channel = supabase
  .channel(`drafts:${userId}`)
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'drafts' },
    (payload) => { /* handle change */ }
  )
  .subscribe()
```

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.2 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Naming conventions, Zustand patterns, Realtime channels
- [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend Architecture`] — RSC vs Client Components, state management
- [Source: `_bmad-output/implementation-artifacts/5-1-asynchronous-draft-generation-pipeline.md`] — Drafts table schema, status tracking
- [Source: `types/draft.ts`] — DraftStatus enum and Draft interface
- [Source: `stores/inbox-store.ts`] — Zustand store pattern reference
