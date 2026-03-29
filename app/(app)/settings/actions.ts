"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function connectGmailAction(): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { error: "Not authenticated." }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId || !siteUrl) {
    return { error: "Gmail OAuth is not configured." }
  }

  // Google requires the redirect_uri to be registered exactly — no query params allowed.
  // We pass provider identity via the `state` parameter instead.
  const redirectUri = `${siteUrl}/auth/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://mail.google.com/",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: "gmail",
  })

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }
}

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
