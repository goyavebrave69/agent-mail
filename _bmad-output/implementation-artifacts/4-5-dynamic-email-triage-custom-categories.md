# Story 4.5: Dynamic Email Triage Using User-Defined Categories

## Story

**As a** user,
**I want** incoming emails to be automatically sorted into my own custom categories,
**So that** my inbox reflects my business vocabulary instead of generic labels.

---

## Status: ready-for-dev

---

## Context

Currently, the triage pipeline in `supabase/functions/sync-emails/triage.ts` uses a hardcoded set of 6 categories (`quote`, `inquiry`, `invoice`, `follow_up`, `spam`, `other`) with a fixed `CHECK` constraint on the `emails.category` column. Custom categories created by users in the app are never used for triage — the AI never sees them.

Each user can create custom categories (with name + description) stored in the `custom_categories` table. This story makes the triage pipeline fully dynamic: the AI classifies emails using the user's own categories and their descriptions as context.

---

## Acceptance Criteria

**AC1 — Migration: free-text category column**
Given the `emails.category` column currently has a `CHECK (category IN ('quote', ...))` constraint,
When migration 023 runs,
Then the constraint is dropped and the column accepts any `TEXT` value.

**AC2 — Dynamic triage prompt**
Given a user has custom categories with names and descriptions,
When `triageEmail()` is called during sync,
Then the LLM prompt lists the user's categories (name + description) instead of hardcoded ones,
And the returned slug matches one of the user's category slugs.

**AC3 — Fallback when no custom categories**
Given a user has zero custom categories,
When triage runs,
Then all emails receive the category `"inbox"` (neutral fallback — no LLM call needed).

**AC4 — Unknown slug protection**
Given the LLM returns a slug that does not match any of the user's category slugs,
When the result is processed,
Then the email is assigned `"inbox"` as fallback.

**AC5 — User categories loaded per sync job**
Given sync runs for multiple users,
When `syncGmail` or `syncOutlook` processes emails for a user,
Then the user's custom categories are fetched from `custom_categories` once per sync job,
And passed to `triageEmail()` for every email in that job.

**AC6 — Dynamic inbox grouping**
Given a user has custom categories,
When the inbox is displayed,
Then emails are grouped by their stored category slug,
And the group label shows the category `name` from `custom_categories`,
And emails in `"inbox"` (fallback) are shown under an "Inbox" group.

**AC7 — No system category hardcoding in triage**
Given the triage module is updated,
Then the strings `quote`, `inquiry`, `invoice`, `follow_up`, `spam`, `other` no longer appear in `triage.ts` as classification targets.

---

## Technical Requirements

### 1. Migration 023: drop CHECK constraint on `emails.category`

New file: `supabase/migrations/023_emails_category_free_text.sql`

```sql
ALTER TABLE public.emails
  DROP CONSTRAINT IF EXISTS emails_category_check;

-- Update existing emails with system categories to keep them valid
-- (no data change needed — old slugs like 'quote' remain as-is, still display fine)

COMMENT ON COLUMN public.emails.category IS
  'Category slug assigned by triage. Matches custom_categories.slug for the user, or "inbox" as fallback.';
```

### 2. Refactor `supabase/functions/sync-emails/triage.ts`

Remove all hardcoded category logic. New signature:

```typescript
export interface UserCategory {
  slug: string
  name: string
  description: string | null
}

export interface TriageResult {
  category: string  // slug from UserCategory, or "inbox"
  priorityRank: number
}

export async function triageEmail(
  subject: string | null,
  fromEmail: string | null,
  userCategories: UserCategory[],
  openAiApiKey: string
): Promise<TriageResult>
```

**Logic:**
- If `userCategories.length === 0` → return `{ category: 'inbox', priorityRank: 0 }` immediately (no LLM call)
- Build prompt dynamically listing each category: `- {slug}: {name} — {description ?? name}`
- Ask LLM to return `{ "category": "<slug>" }`
- Validate: returned slug must be in `userCategories.map(c => c.slug)`
- If invalid or error → fallback `{ category: 'inbox', priorityRank: 0 }`
- Priority rank: position in the user's category list (first = highest). Formula: `(userCategories.length - index) * 10`

**Remove:** `EmailCategory` union type, `PRIORITY_MAP`, `VALID_CATEGORIES` set — all hardcoded.

### 3. Update `supabase/functions/sync-emails/index.ts`

In `syncGmail` and `syncOutlook`, before the email loop:

```typescript
// Load user's custom categories once per sync job
const { data: categoryRows } = await supabase
  .from('custom_categories')
  .select('slug, name, description')
  .eq('user_id', job.user_id)
  .order('sort_order', { ascending: true })

const userCategories: UserCategory[] = categoryRows ?? []
```

Pass `userCategories` to every `triageEmail()` call (replacing the current `openAiApiKey`-only call).

Update the `triage.ts` import: `import { triageEmail, type UserCategory } from './triage.ts'`

Remove `type EmailCategory` import (no longer needed).

### 4. Update `types/email.ts`

```typescript
// Before:
export type EmailCategory = 'quote' | 'inquiry' | 'invoice' | 'follow_up' | 'spam' | 'other'

// After:
export type EmailCategory = string
```

### 5. Update inbox UI for dynamic grouping

**`components/inbox/inbox-list.tsx`** — `CATEGORY_BADGE` is currently hardcoded to 6 system categories. It should remain for backwards compatibility (emails synced before this story still have old slugs), but the inbox shell should prefer the user's live category names.

**`components/inbox/inbox-shell.tsx`** — `CATEGORY_ORDER` is hardcoded. Replace with dynamic grouping:

```typescript
// Build group order from user's custom categories
const categoryGroups = useMemo(() => {
  // Emails with custom category slugs → group by slug, use category name as label
  // Emails with unknown/old slugs → group under "inbox"
  const slugToName = new Map(customCategories.map(c => [c.slug, c.name]))
  const groups = new Map<string, { label: string; emails: InboxEmail[] }>()

  for (const email of filteredEmails) {
    const slug = email.category
    const label = slugToName.get(slug) ?? 'Inbox'
    const key = slugToName.has(slug) ? slug : 'inbox'
    if (!groups.has(key)) groups.set(key, { label, emails: [] })
    groups.get(key)!.emails.push(email)
  }

  return Array.from(groups.values())
}, [filteredEmails, customCategories])
```

---

## File Locations

| File | Action |
|------|--------|
| `supabase/migrations/023_emails_category_free_text.sql` | New migration — drop CHECK constraint |
| `supabase/functions/sync-emails/triage.ts` | Refactor — dynamic categories, remove hardcoded enum |
| `supabase/functions/sync-emails/index.ts` | Update — load user categories before triage |
| `types/email.ts` | Update — `EmailCategory = string` |
| `components/inbox/inbox-shell.tsx` | Update — dynamic group rendering |
| `lib/ai/triage.test.ts` | Update — tests use `userCategories` param |

---

## Dev Guardrails

- **Never break existing emails**: old emails with system category slugs (`quote`, `invoice`, etc.) must still display. The fallback grouping under "Inbox" handles unknowns gracefully.
- **No LLM call when no categories**: skip entirely and assign `"inbox"`. Don't waste tokens.
- **Slug validation is mandatory**: the LLM can hallucinate. Always cross-check returned slug against `userCategories` before storing.
- **One DB query per sync job, not per email**: fetch `custom_categories` once before the email loop.
- **Triage test suite**: update `lib/ai/triage.test.ts` to pass `userCategories` array instead of relying on hardcoded categories. Add tests for: empty categories fallback, unknown slug fallback, valid slug matching.
- **Deploy Edge Function** after code changes: `npx supabase functions deploy sync-emails`.

---

## Context from Previous Stories

- **Story 4.1** introduced `category` and `priority_rank` columns with a strict `CHECK` constraint. This story removes that constraint.
- **Story 5.10** added custom category management (create/edit/delete with `name`, `slug`, `description`). The `description` field (added in the current sprint) provides LLM context.
- **`custom_categories` schema**: `id`, `user_id`, `name`, `slug`, `description`, `sort_order`.
- **`triage.ts`** currently lives in `supabase/functions/sync-emails/triage.ts` (Deno runtime — no Node imports, use `fetch` directly).
