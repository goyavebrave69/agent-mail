import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { InboxShell } from "@/components/inbox/inbox-shell"
import type { InboxCategory } from "@/components/inbox/inbox-list"

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
  body_text: string | null
}

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

  const { data: allEmails } = await supabase
    .from("emails")
    .select(
      "id, subject, from_email, from_name, received_at, is_read, is_archived, category, priority_rank, body_text"
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("priority_rank", { ascending: false })
    .order("received_at", { ascending: false })

  const emails = ((allEmails as InboxEmail[]) ?? [])
  const visibleEmails = category ? emails.filter((email) => email.category === category) : emails

  return (
    <InboxShell
      emails={visibleEmails}
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
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent category={category} />
    </Suspense>
  )
}
