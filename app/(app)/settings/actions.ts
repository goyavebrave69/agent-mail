"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { randomUUID } from "crypto"
import { ImapFlow } from "imapflow"

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
  const stateToken = `gmail:${randomUUID()}`
  const cookieStore = await cookies()
  cookieStore.set("oauth_state_gmail", stateToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  })

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
    state: stateToken,
  })

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }
}

export async function connectOutlookAction(): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { error: "Not authenticated." }
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId || !siteUrl) {
    return { error: "Outlook OAuth is not configured." }
  }

  const redirectUri = `${siteUrl}/auth/callback`
  const stateToken = `outlook:${randomUUID()}`
  const cookieStore = await cookies()
  cookieStore.set("oauth_state_outlook", stateToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/User.Read",
      "offline_access",
    ].join(" "),
    access_type: "offline",
    state: stateToken,
  })

  return {
    url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
  }
}

async function testImapConnection(host: string, port: number, username: string, password: string): Promise<void> {
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user: username, pass: password },
    logger: false,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
  })
  await client.connect()
  await client.logout()
}

export async function connectImapAction(params: {
  host: string
  port: number
  username: string
  password: string
}): Promise<{ success: true } | { error: string }> {
  const { host, port, username, password } = params

  if (!host || !username || !password) {
    return { error: "IMAP_INVALID_INPUT" }
  }
  if (port !== 993 && port !== 143) {
    return { error: "IMAP_INVALID_INPUT" }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return { error: "Not authenticated." }
  }
  const userId = data.user.id

  try {
    await testImapConnection(host, port, username, password)
  } catch (e: unknown) {
    const err = e as { code?: string; responseCode?: string; message?: string }
    if (
      err.responseCode === "AUTHENTICATIONFAILED" ||
      err.message?.includes("Invalid credentials") ||
      err.message?.includes("Authentication failed")
    ) {
      return { error: "IMAP_AUTH_FAILED" }
    }
    return { error: "IMAP_UNREACHABLE" }
  }

  const adminClient = createAdminClient()

  const { data: vaultSecretId, error: vaultError } = await adminClient.rpc("create_vault_secret", {
    secret: JSON.stringify({ host, port, username, password }),
    name: `imap:${userId}`,
  })

  if (vaultError) {
    return { error: "IMAP_UNREACHABLE" }
  }

  const { error: upsertError } = await adminClient.from("email_connections").upsert(
    {
      user_id: userId,
      provider: "imap",
      email: username,
      vault_secret_id: vaultSecretId as string,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  )

  if (upsertError) {
    return { error: "IMAP_UNREACHABLE" }
  }

  return { success: true }
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
