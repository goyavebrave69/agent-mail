import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/layout/app-sidebar"
import type { CustomCategory } from "@/lib/inbox/custom-categories"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let customCategories: CustomCategory[] = []
  const unreadCounts: Record<string, number> = {}
  if (user) {
    const [{ data: catData }, { data: unreadData }] = await Promise.all([
      supabase
        .from("custom_categories")
        .select("id, name, slug, description, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("emails")
        .select("category")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_archived", false),
    ])
    customCategories = (catData as CustomCategory[] | null) ?? []
    for (const row of (unreadData ?? []) as { category: string | null }[]) {
      const cat = row.category ?? "inbox"
      unreadCounts[cat] = (unreadCounts[cat] ?? 0) + 1
    }
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar customCategories={customCategories} unreadCounts={unreadCounts} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
