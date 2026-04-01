# Story 5.6: Reject Draft & Compose Own Reply

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** to reject an AI draft and write my own reply from scratch,
**So that** I maintain full control when the AI cannot help.

---

## Acceptance Criteria

**Given** the user clicks "Reject" on a draft
**When** the action executes
**Then** the draft status is updated to `rejected`
**And** a blank compose area replaces the draft editor

**Given** the user writes their reply in the compose area and clicks "Send"
**When** the Server Action executes
**Then** the manually written email is sent via the connected provider API
**And** the email is marked as handled

---

## Technical Requirements

### 1. Update Draft Store: `stores/draft-store.ts`

Add rejection and manual compose state.

```typescript
interface DraftStore {
  // ... existing state from Stories 5-2, 5-3, 5-4, 5-5
  
  // Rejection / Manual compose state
  isRejected: boolean
  isComposing: boolean
  manualContent: string
  
  // Rejection actions
  optimisticReject: () => void
  confirmReject: () => void
  
  // Manual compose actions
  startComposing: () => void
  updateManualContent: (content: string) => void
  cancelComposing: () => void
}
```

**Implementation:**
- `optimisticReject`: Set `isRejected = true`, close any open UI
- `confirmReject`: Persist rejection state
- `startComposing`: Set `isComposing = true`, initialize `manualContent = ''`
- `updateManualContent`: Update `manualContent` as user types
- `cancelComposing`: Return to rejected state (empty compose area)

### 2. Reject Draft Server Action: `app/(app)/inbox/[emailId]/actions.ts`

New Server Action for rejecting draft.

```typescript
export interface RejectDraftResult {
  success: boolean
  error?: string
}

export async function rejectDraft(draftId: string): Promise<RejectDraftResult>
```

**Workflow:**
1. Authenticate user via Supabase
2. Verify draft ownership (RLS)
3. Verify draft status is `ready` or `error` (can't reject sent drafts)
4. Update draft status to `rejected`
5. Update `updated_at` timestamp
6. Return success

**Database update:**
```typescript
const { error } = await supabase
  .from('drafts')
  .update({ 
    status: 'rejected',
    updated_at: new Date().toISOString()
  })
  .eq('id', draftId)
  .eq('user_id', user.id)  // RLS enforcement

if (error) {
  return { success: false, error: error.message }
}

return { success: true }
```

### 3. Manual Compose Component: `components/draft/manual-compose.tsx`

New file. Blank compose area for user-written replies.

```typescript
interface ManualComposeProps {
  emailId: string
  onSend: (content: string) => void
  onCancel: () => void
}
```

**UI Design:**
- Large textarea (min 200px height, auto-expand to 500px)
- Placeholder: "Write your reply..."
- Character counter (max 10000)
- Formatting hint: "Plain text only"
- Action buttons:
  - "Cancel" (ghost) — return to rejected state
  - "Send" (primary) — send manual reply

**Behaviors:**
- Auto-focus textarea on mount
- Tab key inserts 2 spaces
- Send button disabled if content empty or only whitespace
- Shows loading state during send

### 4. Send Manual Reply Server Action

Update `app/(app)/inbox/[emailId]/actions.ts`:

```typescript
export async function sendManualReply(
  emailId: string,
  content: string
): Promise<SendDraftResult>  // Reuse result type from Story 5-3
```

**Workflow:**
1. Authenticate user
2. Fetch email metadata and connection
3. Validate content (non-empty, max length)
4. Send via `sendEmailViaProvider()` (from Story 5-3)
5. Create or update draft record:
   - If draft exists: update status to `sent`, content to manual reply
   - If no draft: create new draft with status `sent`
6. Mark email as handled (archived)
7. Return success

**Draft record handling:**
```typescript
// Check for existing draft
const { data: existingDraft } = await supabase
  .from('drafts')
  .select('id')
  .eq('email_id', emailId)
  .eq('user_id', user.id)
  .maybeSingle()

if (existingDraft) {
  // Update existing draft
  await supabase
    .from('drafts')
    .update({
      content: content,
      status: 'sent',
      confidence_score: null,  // Manual reply has no AI confidence
      updated_at: new Date().toISOString()
    })
    .eq('id', existingDraft.id)
} else {
  // Create new draft record for manual reply
  await supabase
    .from('drafts')
    .insert({
      user_id: user.id,
      email_id: emailId,
      content: content,
      status: 'sent',
      confidence_score: null
    })
}
```

### 5. Draft Section Update for Rejected State

Update `components/draft/draft-section.tsx`:

```typescript
export function DraftSection({ draft, emailId }: DraftSectionProps) {
  const store = useDraftStore()
  const { isRejected, isComposing, manualContent } = store
  
  // If draft was rejected
  if (draft?.status === 'rejected' || isRejected) {
    if (isComposing) {
      return (
        <ManualCompose
          emailId={emailId}
          onSend={async (content) => {
            const result = await sendManualReply(emailId, content)
            if (result.success) {
              store.confirmSend()
            } else {
              // Show error
            }
          }}
          onCancel={() => store.cancelComposing()}
        />
      )
    }
    
    // Show "Write your own reply" prompt
    return (
      <div className="rejected-draft-state">
        <p className="text-muted-foreground">
          AI draft rejected. You can write your own reply.
        </p>
        <Button onClick={() => store.startComposing()}>
          Write Reply
        </Button>
      </div>
    )
  }
  
  // ... normal draft display from Story 5-2
}
```

### 6. Draft Actions Component Update

Update `components/draft/draft-actions.tsx` with reject button:

```typescript
export function DraftActions({ draftId, emailId, status }: DraftActionsProps) {
  const store = useDraftStore()
  
  const handleReject = async () => {
    // Confirm with user (optional)
    if (!confirm('Reject this draft? You can write your own reply instead.')) {
      return
    }
    
    store.optimisticReject()
    
    const result = await rejectDraft(draftId)
    
    if (result.success) {
      store.confirmReject()
    } else {
      // Show error toast
    }
  }
  
  return (
    <div className="draft-actions">
      {/* Validate & Send, Edit from previous stories */}
      
      {/* Regenerate from Story 5-5 */}
      
      {/* Reject button - subtle/ghost style */}
      <Button
        onClick={handleReject}
        disabled={status === 'generating' || status === 'sent' || status === 'rejected'}
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
      >
        Reject
      </Button>
    </div>
  )
}
```

**Button styling:**
- Ghost variant (no background)
- Small size
- Muted color, turns red on hover
- Positioned after other actions (least prominent)

### 7. Rejection Confirmation (Optional)

Simple browser confirm before rejecting:

```typescript
const handleReject = async () => {
  const confirmed = window.confirm(
    'Reject this AI draft?\n\nYou can write your own reply or regenerate instead.'
  )
  if (!confirmed) return
  
  // ... proceed with rejection
}
```

Future enhancement: Use shadcn/ui AlertDialog for better UX.

### 8. Rejected State UI

Visual treatment for rejected drafts:

```tsx
<div className="rejected-draft-state border border-dashed border-muted-foreground/30 rounded-lg p-6">
  <div className="flex items-center gap-2 text-muted-foreground mb-4">
    <BanIcon className="w-5 h-5" />
    <span>Draft rejected</span>
  </div>
  
  <p className="text-sm text-muted-foreground mb-4">
    The AI draft wasn't suitable. Write your own reply below.
  </p>
  
  <Button onClick={() => store.startComposing()}>
    <PencilIcon className="w-4 h-4 mr-2" />
    Write Reply
  </Button>
</div>
```

### 9. Manual Compose Tests: `components/draft/manual-compose.test.tsx`

**Required test cases:**
1. Renders textarea with placeholder
2. Auto-focuses textarea on mount
3. Character counter updates as user types
4. Send button disabled when content empty
5. Send button enabled when content entered
6. Calls onCancel when Cancel clicked
7. Calls onSend with content when Send clicked

### 10. Reject Action Tests

**Required test cases:**
1. Updates draft status to `rejected` on success
2. Returns error when draft not found
3. Prevents rejecting already sent drafts
4. UI updates optimistically before server confirm

### 11. Store Tests Update

**Required test cases:**
1. `optimisticReject` sets `isRejected = true`
2. `startComposing` sets `isComposing = true`
3. `updateManualContent` updates `manualContent`
4. `cancelComposing` resets to rejected state

---

## File Locations

| File | Action |
|------|--------|
| `stores/draft-store.ts` | Add rejection and manual compose state/actions |
| `stores/draft-store.test.ts` | Add rejection/compose tests |
| `components/draft/manual-compose.tsx` | New manual reply compose component |
| `components/draft/manual-compose.test.tsx` | Tests for manual compose |
| `app/(app)/inbox/[emailId]/actions.ts` | Add `rejectDraft` and `sendManualReply` actions |
| `components/draft/draft-section.tsx` | Update to handle rejected state |
| `components/draft/draft-actions.tsx` | Add reject button |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **Terminal state:** `rejected` is terminal like `sent` — no further AI actions.
- **Manual reply tracking:** Store manual replies as `sent` drafts for history.
- **Clear UX:** Rejection should feel intentional, not accidental.
- **Escape hatch:** User can always write their own reply when AI fails.

### Rejection Flow State Machine

```
ready ──[Reject btn]──→ rejected (terminal state)
                           │
                           ├──[Write Reply]──→ composing
                           │                      │
                           │                      ├──[Type]──→ Track content
                           │                      │
                           │                      └──[Send]──→ sent
                           │
                           └──[Regenerate?]──→ Not allowed from rejected
```

Note: Once rejected, user cannot regenerate — must write manual reply or reload page to get fresh start.

### UX Guidelines

- Make reject button subtle (avoid accidental clicks)
- Confirmation dialog prevents accidents
- Clear visual distinction in rejected state
- Manual compose area should feel like a clean slate

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 5-1: Asynchronous Draft Generation Pipeline — drafts table exists
- Story 5-2: Draft View with Confidence Score — draft UI components
- Story 5-3: Validate & Send Draft — send logic, provider APIs
- Story 5-4: Edit Draft Before Sending — store patterns
- Story 5-5: Regenerate Draft — action patterns, modal patterns

**Related ongoing work:**
- None — this completes the draft action set

---

## Context from Previous Stories

**Pattern for status updates:**
```typescript
// From Story 5-3
const { error } = await supabase
  .from('drafts')
  .update({ status: 'sent' })
  .eq('id', draftId)
```

**Pattern for manual content:**
```typescript
// Similar to editedContent pattern from Story 5-4
interface DraftStore {
  manualContent: string  // User's manual reply
}
```

**Pattern for sending:**
```typescript
// From Story 5-3
const result = await sendEmailViaProvider(provider, credentials, {
  to: email.from,
  subject: `Re: ${email.subject}`,
  body: content
})
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

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.6 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Status enums, Server Actions
- [Source: `_bmad-output/implementation-artifacts/5-2-draft-view-with-confidence-score.md`] — Draft UI base
- [Source: `_bmad-output/implementation-artifacts/5-3-validate-and-send-draft.md`] — Send action patterns
- [Source: `_bmad-output/implementation-artifacts/5-4-edit-draft-before-sending.md`] — Store patterns for content editing
