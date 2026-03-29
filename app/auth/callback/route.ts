import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Provider is passed via `state` param (Google doesn't allow query params in redirect_uri)
  const state = searchParams.get("state")

  if (state === "gmail") {
    return handleGmailCallback(request)
  }

  // Unknown provider — redirect to settings with a generic error
  return NextResponse.redirect(new URL("/settings?error=unknown_provider", request.url))
}

async function handleGmailCallback(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=gmail_denied", request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId || !clientSecret || !siteUrl) {
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  // Exchange authorization code for tokens
  let tokenData: {
    access_token: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${siteUrl}/auth/callback`,
        grant_type: "authorization_code",
      }),
    })

    tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("[gmail-callback] token exchange failed", tokenData.error, tokenResponse.status)
      return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
    }
  } catch (e) {
    console.error("[gmail-callback] token fetch exception", e)
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  if (!tokenData.access_token) {
    console.error("[gmail-callback] no access_token in token response")
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  // Fetch the user's Gmail address
  let gmailEmail: string

  try {
    const profileResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )

    if (!profileResponse.ok) {
      console.error("[gmail-callback] profile fetch failed", profileResponse.status)
      return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
    }

    const profile = await profileResponse.json()
    gmailEmail = profile.emailAddress
  } catch (e) {
    console.error("[gmail-callback] profile fetch exception", e)
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  if (!gmailEmail) {
    console.error("[gmail-callback] no emailAddress in profile response")
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  // Get the currently logged-in Supabase user
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const userId = userData.user.id
  const adminClient = createAdminClient()

  // Store tokens in Supabase Vault (never plain DB columns — NFR11)
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  const vaultSecret = JSON.stringify({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: expiresAt,
  })

  // Store tokens in Supabase Vault via public wrapper (service role required)
  // vault.create_secret is not callable directly from supabase-js (schema prefix issue)
  const { data: vaultSecretId, error: vaultError } = await adminClient
    .rpc("create_vault_secret", {
      secret: vaultSecret,
      name: `gmail:${userId}`,
    })

  if (vaultError || !vaultSecretId) {
    console.error("[gmail-callback] vault storage failed", vaultError)
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  const vaultData = { id: vaultSecretId as string }

  // Upsert the email connection record (handles reconnection)
  const { error: upsertError } = await adminClient
    .from("email_connections")
    .upsert(
      {
        user_id: userId,
        provider: "gmail",
        email: gmailEmail,
        vault_secret_id: vaultData.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (upsertError) {
    console.error("[gmail-callback] email_connections upsert failed", upsertError)
    return NextResponse.redirect(new URL("/settings?error=gmail_failed", request.url))
  }

  return NextResponse.redirect(new URL("/settings?connected=gmail", request.url))
}
