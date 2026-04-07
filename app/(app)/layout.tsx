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
  if (user) {
    const { data } = await supabase
      .from("custom_categories")
      .select("id, name, slug")
      .eq("user_id", user.id)
      .order("name", { ascending: true })
    customCategories = (data as CustomCategory[] | null) ?? []
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar customCategories={customCategories} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
