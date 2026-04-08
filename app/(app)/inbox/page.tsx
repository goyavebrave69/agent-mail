import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { InboxShell } from "@/components/inbox/inbox-shell"
import type { CustomCategory } from "@/lib/inbox/custom-categories"
import type { EmailCategory } from "@/types/email"

export interface InboxEmail {
  id: string
  subject: string | null
  from_email: string | null
  from_name: string | null
  received_at: string
  is_read: boolean
  is_archived: boolean
  category: EmailCategory
  priority_rank: number
  body_text: string | null
  body_html: string | null
}

interface InboxPageProps {
  searchParams: Promise<{ category?: string }>
}

function normalizeCategory(
  value: string | undefined,
  customCategorySlugs: Set<string>
): string | null {
  if (!value) return null
  return customCategorySlugs.has(value) ? value : null
}

async function InboxContent({ categoryParam }: { categoryParam?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: customCategoryRows } = await supabase
    .from("custom_categories")
    .select("id, name, slug, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })

  const customCategories = (customCategoryRows as CustomCategory[] | null) ?? []
  const customCategorySlugs = new Set(customCategories.map((customCategory) => customCategory.slug))
  const category = normalizeCategory(categoryParam, customCategorySlugs)

  const { data: allEmails } = await supabase
    .from("emails")
    .select(
      "id, subject, from_email, from_name, received_at, is_read, is_archived, category, priority_rank, body_text, body_html"
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

  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent categoryParam={resolvedParams.category} />
    </Suspense>
  )
}
