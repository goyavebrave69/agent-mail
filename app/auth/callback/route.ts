import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

type OAuthProvider = "gmail" | "outlook"

function getCookieValue(request: NextRequest, name: string): string | undefined {
  const requestWithCookies = request as NextRequest & {
    cookies?: { get?: (key: string) => { value?: string } | undefined }
  }
  const cookieApiValue = requestWithCookies.cookies?.get?.(name)?.value

  if (cookieApiValue) {
    return cookieApiValue
  }

  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return undefined
  }

  for (const token of cookieHeader.split(";")) {
    const [key, ...valueParts] = token.trim().split("=")
    if (key === name) {
      return decodeURIComponent(valueParts.join("="))
    }
  }

  return undefined
}

function isValidOAuthState(request: NextRequest, provider: OAuthProvider, stateToken: string): boolean {
  const expectedState = getCookieValue(request, `oauth_state_${provider}`)
  return Boolean(expectedState && expectedState === stateToken)
}

function redirectWithProviderStateCleanup(
  request: NextRequest,
  path: string,
  provider: OAuthProvider
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.cookies.set(`oauth_state_${provider}`, "", { path: "/", maxAge: 0 })
  return response
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Provider is passed via `state` param (Google doesn't allow query params in redirect_uri)
  const state = searchParams.get("state")

  if (state?.startsWith("gmail:")) {
    return handleGmailCallback(request, state)
  }

  if (state?.startsWith("outlook:")) {
    return handleOutlookCallback(request, state)
  }

  // Unknown provider — redirect to settings with a generic error
  return NextResponse.redirect(new URL("/settings?error=unknown_provider", request.url))
}

async function handleGmailCallback(request: NextRequest, stateToken: string): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (!isValidOAuthState(request, "gmail", stateToken)) {
    console.error("[gmail-callback] state validation failed")
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  if (error || !code) {
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_denied", "gmail")
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId || !clientSecret || !siteUrl) {
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
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
      return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
    }
  } catch (e) {
    console.error("[gmail-callback] token fetch exception", e)
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  if (!tokenData.access_token) {
    console.error("[gmail-callback] no access_token in token response")
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
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
      return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
    }

    const profile = await profileResponse.json()
    gmailEmail = profile.emailAddress
  } catch (e) {
    console.error("[gmail-callback] profile fetch exception", e)
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  if (!gmailEmail) {
    console.error("[gmail-callback] no emailAddress in profile response")
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  // Get the currently logged-in Supabase user
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return redirectWithProviderStateCleanup(request, "/login", "gmail")
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
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  // Upsert the email connection record (handles reconnection)
  const { error: upsertError } = await adminClient
    .from("email_connections")
    .upsert(
      {
        user_id: userId,
        provider: "gmail",
        email: gmailEmail,
        vault_secret_id: vaultSecretId as string,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (upsertError) {
    console.error("[gmail-callback] email_connections upsert failed", upsertError)
    return redirectWithProviderStateCleanup(request, "/settings?error=gmail_failed", "gmail")
  }

  return redirectWithProviderStateCleanup(request, "/settings?connected=gmail", "gmail")
}

async function handleOutlookCallback(request: NextRequest, stateToken: string): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (!isValidOAuthState(request, "outlook", stateToken)) {
    console.error("[outlook-callback] state validation failed")
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  if (error || !code) {
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_denied", "outlook")
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId || !clientSecret || !siteUrl) {
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  // Exchange authorization code for tokens
  let tokenData: {
    access_token: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }

  try {
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${siteUrl}/auth/callback`,
          grant_type: "authorization_code",
        }),
      }
    )

    tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error(
        "[outlook-callback] token exchange failed",
        tokenData.error,
        tokenResponse.status
      )
      return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
    }
  } catch (e) {
    console.error("[outlook-callback] token fetch exception", e)
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  if (!tokenData.access_token) {
    console.error("[outlook-callback] no access_token in token response")
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  // Fetch the user's Outlook email address from Microsoft Graph
  let outlookEmail: string

  try {
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!profileResponse.ok) {
      console.error("[outlook-callback] profile fetch failed", profileResponse.status)
      return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
    }

    const profile = await profileResponse.json()
    // `mail` can be null for Exchange-only tenants; `userPrincipalName` is always present
    outlookEmail = profile.mail ?? profile.userPrincipalName
  } catch (e) {
    console.error("[outlook-callback] profile fetch exception", e)
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  if (!outlookEmail) {
    console.error("[outlook-callback] no email in profile response")
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  // Get the currently logged-in Supabase user
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return redirectWithProviderStateCleanup(request, "/login", "outlook")
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
  const { data: vaultSecretId, error: vaultError } = await adminClient.rpc(
    "create_vault_secret",
    {
      secret: vaultSecret,
      name: `outlook:${userId}`,
    }
  )

  if (vaultError || !vaultSecretId) {
    console.error("[outlook-callback] vault storage failed", vaultError)
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  // Upsert the email connection record (handles reconnection)
  const { error: upsertError } = await adminClient
    .from("email_connections")
    .upsert(
      {
        user_id: userId,
        provider: "outlook",
        email: outlookEmail,
        vault_secret_id: vaultSecretId as string,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )

  if (upsertError) {
    console.error("[outlook-callback] email_connections upsert failed", upsertError)
    return redirectWithProviderStateCleanup(request, "/settings?error=outlook_failed", "outlook")
  }

  return redirectWithProviderStateCleanup(request, "/settings?connected=outlook", "outlook")
}
