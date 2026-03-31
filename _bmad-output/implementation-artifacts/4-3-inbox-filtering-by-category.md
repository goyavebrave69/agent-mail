# Story 4.3: Inbox Filtering by Category

## Status: ready-for-dev

## Story

**As a** user,
**I want** to filter my inbox by email category,
**So that** I can focus on one type of email at a time (e.g., only quotes).

## Acceptance Criteria

**Given** the user selects a category filter (e.g., "Quotes")
**When** the filter is applied
**Then** only emails matching that category are displayed
**And** the active filter is reflected in the URL (`?category=quote`) so it persists on refresh

**Given** the user clears the filter
**When** the action executes
**Then** all emails are shown again sorted by priority (highest first)

## What Exists (Do NOT recreate)

- `app/(app)/inbox/page.tsx` — RSC that queries emails sorted by `priority_rank DESC, received_at DESC`
- `components/inbox/inbox-list.tsx` — Client Component with Realtime subscription and polling fallback
- `InboxEmail` type exported from `app/(app)/inbox/page.tsx`
- DB `emails` table has `category` column (TEXT with CHECK constraint: quote | inquiry | invoice | follow_up | spam | other)

## What To Build

### 1. `components/inbox/inbox-filters.tsx` (NEW — Client Component)

```
'use client'
```

- Renders a row of filter buttons, one per category + an "All" button
- Uses `useSearchParams()` + `useRouter()` from `next/navigation`
- Clicking a category sets `?category={value}` in the URL
- Clicking "All" (or the active category again) removes the `category` searchParam
- Active filter button is visually highlighted
- Use the same `CATEGORY_BADGE` color mapping already defined in `inbox-list.tsx` for visual consistency — **do not redefine colors; import or duplicate the mapping**

**URL manipulation pattern:**
```typescript
const router = useRouter()
const searchParams = useSearchParams()

function setFilter(category: string | null) {
  const params = new URLSearchParams(searchParams.toString())
  if (category) {
    params.set('category', category)
  } else {
    params.delete('category')
  }
  router.push(`/inbox?${params.toString()}`)
}
```

### 2. Update `app/(app)/inbox/page.tsx` (MODIFY)

The RSC page receives `searchParams` as a prop in Next.js App Router:

```typescript
export default function InboxPage({
  searchParams,
}: {
  searchParams: { category?: string }
})
```

- Pass `searchParams` down to `InboxContent` as a prop
- Add category filter to the Supabase query **only if** the searchParam is a valid category:

```typescript
const VALID_CATEGORIES = ['quote', 'inquiry', 'invoice', 'follow_up', 'spam', 'other']

// Inside InboxContent:
const query = supabase
  .from('emails')
  .select('id, subject, from_email, from_name, received_at, is_read, is_archived, category, priority_rank')
  .eq('user_id', user.id)
  .eq('is_archived', false)
  .order('priority_rank', { ascending: false })
  .order('received_at', { ascending: false })

if (category && VALID_CATEGORIES.includes(category)) {
  query.eq('category', category)
}
```

- Render `<InboxFilters activeCategory={category ?? null} />` **above** the `<Suspense>` block
- Pass `activeCategory` prop to `InboxFilters` so it can highlight the active button

### 3. No migrations needed

Category column already exists. No DB changes required.

## File Locations

| Action | Path |
|--------|------|
| NEW | `components/inbox/inbox-filters.tsx` |
| MODIFY | `app/(app)/inbox/page.tsx` |
| NEW (test) | `components/inbox/inbox-filters.test.tsx` |

## Architecture Guardrails

- **URL state only** — no Zustand for this story; architecture spec says "URL state (searchParams) for inbox filters and category selection"
- **RSC reads searchParams directly** — Next.js App Router passes `searchParams` prop to page components; no `useSearchParams` in RSC
- **Client Component for filter UI** — `InboxFilters` must be `'use client'` because it uses `useSearchParams` and `useRouter`
- **Validate searchParam before DB query** — never pass arbitrary user input to `.eq('category', ...)` without checking against `VALID_CATEGORIES`
- **Keep Realtime intact** — the filter only affects the initial RSC load; Realtime still calls `router.refresh()` which re-runs the RSC with current searchParams, so filtering + Realtime work together automatically
- **`is_archived: false` always present** — do not remove the archive filter
- **Naming conventions** — `inbox-filters.tsx` (kebab-case), `InboxFilters` component (PascalCase)
- **No new top-level directories** — components go in `components/inbox/`

## Tests

`components/inbox/inbox-filters.test.tsx`:
- Renders all 6 category buttons + "All" button (7 total)
- Active category button has visual highlight class
- Clicking a category calls `router.push` with correct searchParam
- Clicking active category (or "All") removes the searchParam

Follow the co-located test pattern from `inbox-list.test.tsx` if it exists, otherwise follow the Vitest + testing-library pattern used in the project.

## Previous Story Context (4.2)

- `inbox-list.tsx` defines `CATEGORY_BADGE` with label + className for all 6 categories — reuse these labels/colors in `InboxFilters` for consistency
- `inbox-list.tsx` receives `emails` and `userId` props — no changes needed to its interface
- The Supabase query in `page.tsx` uses chained `.order()` calls — add `.eq('category', ...)` **before** the `.order()` calls for correct SQL generation (Supabase JS builder requirement)

## Definition of Done

- [ ] Filter buttons appear above inbox list
- [ ] Clicking a category filters emails (RSC re-runs with DB-level filter)
- [ ] Active filter highlighted in UI
- [ ] URL reflects active filter (`?category=quote`)
- [ ] Refresh keeps filter active
- [ ] "All" or re-clicking active category clears filter
- [ ] Empty state when no emails match filter
- [ ] Realtime updates work with active filter
- [ ] Tests pass
