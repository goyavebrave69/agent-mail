# Story 5.3: Validate & Send Draft

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** user,
**I want** to validate and send a draft with a single click,
**So that** I can process emails in seconds without writing anything.

---

## Acceptance Criteria

**Given** the user clicks "Validate & Send" on a ready draft
**When** the Server Action executes
**Then** the email is sent via the connected provider API (Gmail/Outlook/IMAP)
**And** the send is confirmed within 3 seconds (NFR5)
**And** the draft status is updated to `sent`
**And** the email is removed from the active inbox view
**And** the UI updates optimistically via Zustand before server confirmation

**Given** the send fails (provider API error)
**When** the error occurs
**Then** the draft status remains `ready`, the error is surfaced with a retry option, and no duplicate send occurs

---

## Technical Requirements

### 1. Send Email Server Action: `app/(app)/inbox/[emailId]/actions.ts`

Add new Server Action for sending draft emails.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmailViaProvider } from '@/lib/email/send'
import { revalidatePath } from 'next/cache'

interface SendDraftResult {
  success: boolean
  error?: string
  errorCode?: 'PROVIDER_ERROR' | 'NO_CONNECTION' | 'RATE_LIMIT' | 'UNKNOWN'
}

export async function validateAndSendDraft(draftId: string): Promise<SendDraftResult>
```

**Workflow:**
1. Authenticate user via Supabase server client
2. Fetch draft with email metadata (RLS enforced)
3. Verify draft status is `ready` (not already sent)
4. Fetch user's active email connection from `email_connections`
5. Retrieve OAuth credentials from Supabase Vault
6. Call `sendEmailViaProvider()` with:
   - Provider type (gmail/outlook/imap)
   - Credentials (from Vault)
   - Draft content
   - Original email metadata (for reply threading)
7. On success:
   - Update draft status to `sent`
   - Update email status to `archived` (removes from inbox)
   - Revalidate inbox path
   - Return `{ success: true }`
8. On failure:
   - Log error details
   - Return error with appropriate error code
   - Keep draft in `ready` state for retry

**Duplicate send prevention:**
- Check draft status is `ready` before sending (not `sent`)
- Use database transaction for status update
- Idempotent provider calls where possible

### 2. Email Sending Module: `lib/email/send.ts`

New file. Unified interface for sending emails via any provider.

```typescript
export interface SendEmailParams {
  to: string
  subject: string
  body: string
  replyToMessageId?: string  // For threading
}

export interface SendEmailResult {
  success: boolean
  messageId?: string  // Provider's message ID
  error?: string
}

export async function sendEmailViaProvider(
  provider: 'gmail' | 'outlook' | 'imap',
  credentials: ProviderCredentials,
  params: SendEmailParams
): Promise<SendEmailResult>
```

**Provider routing:**
```typescript
switch (provider) {
  case 'gmail':
    return sendViaGmail(credentials, params)
  case 'outlook':
    return sendViaOutlook(credentials, params)
  case 'imap':
    return sendViaSmtp(credentials, params)
  default:
    throw new Error(`Unsupported provider: ${provider}`)
}
```

### 3. Gmail Send Implementation: `lib/email/gmail.ts`

Add send function to existing Gmail module.

```typescript
export async function sendViaGmail(
  credentials: GmailCredentials,
  params: SendEmailParams
): Promise<SendEmailResult>
```

**Implementation:**
- Use Gmail API `users.messages.send` endpoint
- Construct RFC 2822 formatted email with proper headers
- Handle threading: set `In-Reply-To` and `References` headers if `replyToMessageId` provided
- Return Gmail message ID on success

**Error handling:**
- 401/403: Token expired or invalid → return retryable error
- 429: Rate limit → return rate limit error with retry-after hint
- 5xx: Provider error → return retryable error

### 4. Outlook Send Implementation: `lib/email/outlook.ts`

Add send function to existing Outlook module.

```typescript
export async function sendViaOutlook(
  credentials: OutlookCredentials,
  params: SendEmailParams
): Promise<SendEmailResult>
```

**Implementation:**
- Use Microsoft Graph API `POST /me/sendMail`
- Construct message payload with proper threading headers
- Follow same error handling pattern as Gmail

### 5. IMAP/SMTP Send Implementation: `lib/email/imap.ts`

Add SMTP send capability to existing IMAP module.

```typescript
export async function sendViaSmtp(
  credentials: ImapCredentials,
  params: SendEmailParams
): Promise<SendEmailResult>
```

**Implementation:**
- Connect to SMTP server (port 465 with TLS)
- Send email using nodemailer or similar SMTP library
- Handle authentication with stored credentials

### 6. Optimistic UI Update in Draft Store

Update `stores/draft-store.ts` (from Story 5-2):

```typescript
interface DraftStore {
  // ... existing state
  
  // Optimistic send tracking
  isSending: boolean
  sendError: string | null
  
  // Actions
  optimisticSend: () => void
  confirmSend: () => void
  failSend: (error: string) => void
}
```

**Optimistic flow:**
1. User clicks "Validate & Send"
2. Immediately call `optimisticSend()` → set `isSending = true`
3. Show loading state on button
4. On success: `confirmSend()` → reset store, show success
5. On failure: `failSend(error)` → show error, allow retry

### 7. Draft Actions Component Update: `components/draft/draft-actions.tsx`

Update component from Story 5-2 with send functionality.

```typescript
interface DraftActionsProps {
  draftId: string
  emailId: string
  status: DraftStatus
}

export function DraftActions({ draftId, emailId, status }: DraftActionsProps) {
  const store = useDraftStore()
  
  const handleValidateAndSend = async () => {
    store.optimisticSend()
    
    const result = await validateAndSendDraft(draftId)
    
    if (result.success) {
      store.confirmSend()
      // Optional: show toast success
    } else {
      store.failSend(result.error || 'Failed to send')
    }
  }
  
  return (
    <div className="draft-actions">
      <Button 
        onClick={handleValidateAndSend}
        disabled={status !== 'ready' || store.isSending}
        loading={store.isSending}
        variant="primary"
      >
        {store.isSending ? 'Sending...' : 'Validate & Send'}
      </Button>
      {/* ... other buttons */}
    </div>
  )
}
```

### 8. Send Confirmation UI

Success feedback components:

**Toast notification (optional):**
- "Email sent successfully" with checkmark icon
- Auto-dismiss after 3 seconds

**Inbox update:**
- Email immediately removed from list (optimistic)
- RSC revalidation confirms removal

### 9. Error Handling & Retry UI

Error display in draft-section:

```typescript
// Error state display
{store.sendError && (
  <Alert variant="error">
    <AlertTitle>Failed to send</AlertTitle>
    <AlertDescription>{store.sendError}</AlertDescription>
    <Button onClick={handleValidateAndSend} variant="outline" size="sm">
      Retry
    </Button>
  </Alert>
)}
```

**Error codes and user messages:**
- `PROVIDER_ERROR`: "Email provider error. Please try again."
- `NO_CONNECTION`: "No email connection found. Please reconnect your mailbox."
- `RATE_LIMIT`: "Rate limit exceeded. Please wait a moment before retrying."
- `UNKNOWN`: "Failed to send email. Please try again."

### 10. Migration: Add `sent_at` to drafts table

Update migration `013_drafts.sql` (or new migration `016_drafts_sent_at.sql`):

```sql
-- Add sent timestamp for analytics
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Update status check constraint to ensure valid transitions
-- Note: 'sent' is terminal state - no further updates allowed
```

### 11. Send Email Tests: `lib/email/send.test.ts`

**Required test cases:**
1. Routes to correct provider based on connection type
2. Returns success with message ID when provider succeeds
3. Returns error when provider fails
4. Handles missing credentials gracefully
5. Constructs email with proper threading headers

### 12. Send Action Tests

**Required test cases (in actions.ts test file):**
1. Sends email when draft is in `ready` status
2. Updates draft status to `sent` on success
3. Returns error when draft not found
4. Returns error when no email connection exists
5. Prevents duplicate sends (status check)

---

## File Locations

| File | Action |
|------|--------|
| `app/(app)/inbox/[emailId]/actions.ts` | Add `validateAndSendDraft` Server Action |
| `lib/email/send.ts` | New unified email sending module |
| `lib/email/send.test.ts` | Tests for send module |
| `lib/email/gmail.ts` | Add `sendViaGmail` function |
| `lib/email/outlook.ts` | Add `sendViaOutlook` function |
| `lib/email/imap.ts` | Add `sendViaSmtp` function |
| `stores/draft-store.ts` | Add optimistic send state/actions |
| `components/draft/draft-actions.tsx` | Wire up validate & send action |
| `supabase/migrations/016_drafts_sent_at.sql` | Add sent_at column (optional) |

---

## Dev Guardrails

### Critical Patterns (from Architecture)

- **Never duplicate sends:** Always check draft status is `ready` before sending.
- **Optimistic UI:** Update UI immediately, confirm with server response.
- **Provider abstraction:** All provider-specific logic in `/lib/email/*`, never in components.
- **Error handling:** Surface provider errors to user with retry option.
- **NFR5 compliance:** Send must complete within 3 seconds (provider API timeout).

### Send Flow State Machine

```
ready → [user clicks send] → sending (optimistic)
  ↓
success → sent (terminal state)
  ↓
failure → ready (allow retry)
```

### Security Considerations

- OAuth tokens accessed only from server (Vault read)
- User can only send from their connected email address
- RLS ensures users can only update their own drafts

### Performance Requirements

- Provider API timeout: 5 seconds max
- Total Server Action time: < 3 seconds (NFR5)
- Use `revalidatePath` for efficient cache updates

---

## Dependencies on Previous Stories

**Must be completed first:**
- Story 5-1: Asynchronous Draft Generation Pipeline — drafts table and status tracking
- Story 5-2: Draft View with Confidence Score — draft UI components and store
- Story 2-1, 2-2, 2-3: Email connections — Gmail, Outlook, IMAP connections must exist

**Related ongoing work:**
- Story 5-4, 5-5, 5-6 will add edit, regenerate, and reject actions

---

## Context from Previous Stories

**Pattern for Server Actions:**
```typescript
'use server'

export async function actionName(params): Promise<ResultType> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // ... implementation
}
```

**Pattern for Vault credential access:**
```typescript
// Access OAuth tokens from Supabase Vault
const { data: secret } = await supabase.rpc('get_secret', {
  secret_id: connection.vault_secret_id
})
```

**Pattern for optimistic updates:**
```typescript
// Zustand store
optimisticSend: () => set({ isSending: true, sendError: null })
confirmSend: () => set({ isSending: false, activeDraftId: null })
failSend: (error) => set({ isSending: false, sendError: error })
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

- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 5`] — Story 5.3 requirements and acceptance criteria
- [Source: `_bmad-output/planning-artifacts/architecture.md#Implementation Patterns`] — Server Actions patterns, error handling
- [Source: `_bmad-output/planning-artifacts/architecture.md#Integration Points`] — Provider API integrations
- [Source: `_bmad-output/implementation-artifacts/5-1-asynchronous-draft-generation-pipeline.md`] — Drafts table, status enum
- [Source: `_bmad-output/implementation-artifacts/5-2-draft-view-with-confidence-score.md`] — Draft UI components
