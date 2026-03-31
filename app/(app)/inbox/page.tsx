import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { InboxList } from "@/components/inbox/inbox-list"

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

async function InboxContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: emails } = await supabase
    .from("emails")
    .select(
      "id, subject, from_email, from_name, received_at, is_read, is_archived, category, priority_rank"
    )
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("priority_rank", { ascending: false })
    .order("received_at", { ascending: false })

  return <InboxList emails={(emails as InboxEmail[]) ?? []} userId={user.id} />
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

export default function InboxPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Inbox</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Emails sorted by priority. Most urgent first.
      </p>
      <Suspense fallback={<InboxSkeleton />}>
        <InboxContent />
      </Suspense>
    </main>
  )
}
