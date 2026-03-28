"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function deleteAccountAction(): Promise<{ error: string } | void> {
  try {
    const supabase = await createClient()
    const { data, error: getUserError } = await supabase.auth.getUser()

    if (getUserError || !data.user) {
      return { error: "Not authenticated." }
    }

    const userId = data.user.id
    const adminClient = createAdminClient()

    // Deleting the auth.users row cascades to public.users via ON DELETE CASCADE.
    // Future tables (email_connections, kb_files, drafts) must also declare
    // ON DELETE CASCADE — covered when those epics are implemented.
    // Supabase Storage files (Epic 3) and Vault secrets (Epic 2) are not yet
    // in scope and will be handled in their respective epics.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      return { error: "Unable to delete account. Please try again." }
    }

    redirect("/")
  } catch {
    return { error: "Unable to delete account. Please try again." }
  }
}
