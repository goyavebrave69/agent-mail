import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/layout/app-sidebar"
import type { CustomCategory } from "@/lib/inbox/custom-categories"

async function SidebarLoader() {
  await connection()
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

  return <AppSidebar customCategories={customCategories} unreadCounts={unreadCounts} />
}

async function AuthGuard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return null
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh overflow-hidden">
      <AuthGuard />
      <Suspense fallback={<div className="w-56 shrink-0 border-r" />}>
        <SidebarLoader />
      </Suspense>
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
