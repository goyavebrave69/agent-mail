import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { InboxList } from "@/components/inbox/inbox-list"
import { InboxFilters } from "@/components/inbox/inbox-filters"

export interface InboxEmail {
  id: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  received_at: string
  is_read: boolean
  is_archived: boolean
  category: "quote" | "inquiry" | "invoice" | "follow_up" | "spam" | "other"
  priority_rank: number
}

type InboxCategory = InboxEmail["category"]

interface InboxPageProps {
  searchParams: Promise<{ category?: string }>
}

const VALID_CATEGORIES: InboxCategory[] = [
  "quote",
  "inquiry",
  "invoice",
  "follow_up",
  "spam",
  "other",
]

function normalizeCategory(value?: string): InboxCategory | null {
  if (!value) return null
  return VALID_CATEGORIES.includes(value as InboxCategory) ? (value as InboxCategory) : null
}

async function InboxContent({ category }: { category: InboxCategory | null }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let query = supabase
    .from("emails")
    .select(
      "id, subject, from_email, from_name, received_at, is_read, is_archived, category, priority_rank"
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)

  if (category) {
    query = query.eq("category", category)
  }

  const { data: emails } = await query
    .order("priority_rank", { ascending: false })
    .order("received_at", { ascending: false })

  return (
    <InboxList
      emails={(emails as InboxEmail[]) ?? []}
      userId={user.id}
      activeCategory={category}
    />
  )
}

function InboxSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg border animate-pulse bg-muted" />
      ))}
    </div>
  )
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const resolvedParams = await searchParams
  const category = normalizeCategory(resolvedParams.category)

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Inbox</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Emails sorted by priority. Most urgent first.
      </p>
      <InboxFilters activeCategory={category} />
      <Suspense fallback={<InboxSkeleton />}>
        <InboxContent category={category} />
      </Suspense>
    </main>
  )
}
