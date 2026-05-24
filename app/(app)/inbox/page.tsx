import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { InboxShell } from "@/components/inbox/inbox-shell"
import { isSystemInboxCategory, type CustomCategory } from "@/lib/inbox/custom-categories"
import type { EmailCategory } from "@/types/email"

export interface InboxEmail {
  id: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  received_at: string
  is_read: boolean
  is_archived: boolean
  is_starred: boolean
  category: EmailCategory
  priority_rank: number
  body_text: string | null
  body_html: string | null
  response_type: 'text_reply' | 'pdf_required' | 'unknown'
}

interface InboxPageProps {
  searchParams: Promise<{ category?: string }>
}

function normalizeCategory(
  value: string | undefined,
  customCategorySlugs: Set<string>
): string | null {
  if (!value) return null
  if (isSystemInboxCategory(value)) return value
  return customCategorySlugs.has(value) ? value : null
}

async function InboxContent({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: categoryParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: customCategoryRows } = await supabase
    .from("custom_categories")
    .select("id, name, slug")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  const customCategories = (customCategoryRows as CustomCategory[] | null) ?? []
  const customCategorySlugs = new Set(customCategories.map((customCategory) => customCategory.slug))
  const category = normalizeCategory(categoryParam, customCategorySlugs)

  const { data: allEmails } = await supabase
    .from("emails")
    .select(
      "id, subject, from_email, from_name, received_at, is_read, is_archived, is_starred, category, priority_rank, body_text, body_html, response_type"
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("priority_rank", { ascending: false })
    .order("received_at", { ascending: false })

  const emails = ((allEmails as InboxEmail[]) ?? [])
  const visibleEmails = !category
    ? emails
    : emails.filter((email) => email.category === category)

  return (
    <InboxShell
      emails={visibleEmails}
      userId={user.id}
      activeCategory={category}
      customCategories={customCategories}
    />
  )
}

function InboxSkeleton() {
  return (
    <div className="flex h-full">
      {/* Colonne liste emails */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        {/* Barre de recherche + actions */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="h-7 flex-1 animate-pulse rounded-md bg-muted" />
          <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
        </div>
        {/* Onglets Non lus / Tous */}
        <div className="flex gap-4 border-b px-4 py-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-8 animate-pulse rounded bg-muted" />
        </div>
        {/* Lignes d'emails */}
        <div className="flex-1 divide-y overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 px-4 py-3">
              <div className="flex justify-between">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-10 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted opacity-60" />
            </div>
          ))}
        </div>
      </div>
      {/* Panneau email */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3.5 w-full animate-pulse rounded bg-muted" style={{ width: `${85 - i * 5}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InboxPage({ searchParams }: InboxPageProps) {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent searchParams={searchParams} />
    </Suspense>
  )
}
