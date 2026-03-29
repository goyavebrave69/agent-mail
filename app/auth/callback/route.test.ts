import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOAuthRequest(params: Record<string, string>, cookie: string) {
  const url = new URL("http://localhost:3000/auth/callback")
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString(), {
    headers: {
      cookie,
    },
  })
}

function buildAdminClientMock(overrides?: {
  rpcResult?: { data: unknown; error: unknown }
  upsertResult?: { error: unknown }
}) {
  const rpcResult = overrides?.rpcResult ?? {
    data: "vault-secret-id-abc",
    error: null,
  }
  const upsertResult = overrides?.upsertResult ?? { error: null }

  const mockRpc = vi.fn().mockResolvedValue(rpcResult)
  const mockUpsert = vi.fn().mockResolvedValue(upsertResult)

  return {
    mock: {
      rpc: mockRpc,
      upsert: mockUpsert,
    },
    client: {
      rpc: mockRpc,
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
    },
  }
}

describe("GET /auth/callback — Gmail OAuth", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockRpc: ReturnType<typeof vi.fn>
  let mockUpsert: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })
    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    const { createAdminClient } = await import("@/lib/supabase/admin")
    const admin = buildAdminClientMock()
    mockRpc = admin.mock.rpc
    mockUpsert = admin.mock.upsert
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin.client)

    mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-abc",
          refresh_token: "refresh-xyz",
          expires_in: 3600,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: "user@gmail.com" }),
      } as Response)

    vi.stubGlobal("fetch", mockFetch)
  })

  it("redirects to /settings?connected=gmail on successful connection", async () => {
    const { GET } = await import("./route")
    const req = buildOAuthRequest(
      { state: "gmail:test-state", code: "auth-code-123" },
      "oauth_state_gmail=gmail:test-state"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?connected=gmail")

    expect(mockRpc).toHaveBeenCalledWith("create_vault_secret", expect.objectContaining({
      name: "gmail:user-123",
    }))
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        provider: "gmail",
        email: "user@gmail.com",
        vault_secret_id: "vault-secret-id-abc",
      }),
      { onConflict: "user_id,provider" }
    )
  })

  it("redirects to /settings?error=gmail_denied when user denies OAuth", async () => {
    const { GET } = await import("./route")
    const req = buildOAuthRequest(
      { state: "gmail:test-state", error: "access_denied" },
      "oauth_state_gmail=gmail:test-state"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=gmail_denied")
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("redirects to /settings?error=gmail_failed when token exchange fails", async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
    vi.stubGlobal("fetch", mockFetch)

    const { GET } = await import("./route")
    const req = buildOAuthRequest(
      { state: "gmail:test-state", code: "bad-code" },
      "oauth_state_gmail=gmail:test-state"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=gmail_failed")
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("redirects to /settings?error=gmail_failed when state token is invalid", async () => {
    const { GET } = await import("./route")
    const req = buildOAuthRequest(
      { state: "gmail:attacker-state", code: "auth-code-123" },
      "oauth_state_gmail=gmail:expected-state"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=gmail_failed")
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe("connectGmailAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"

    mockGetUser = vi.fn()
    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    const { cookies } = await import("next/headers")
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      set: vi.fn(),
    })
  })

  it("returns a Google OAuth URL when authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })

    const { connectGmailAction } = await import("@/app/(app)/settings/actions")
    const result = await connectGmailAction()

    expect("url" in result).toBe(true)
    if ("url" in result) {
      expect(result.url).toContain("accounts.google.com/o/oauth2/v2/auth")
      expect(result.url).toContain("access_type=offline")
      expect(result.url).toContain("prompt=consent")
      expect(result.url).toContain("state=gmail%3A")
    }
  })

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { connectGmailAction } = await import("@/app/(app)/settings/actions")
    const result = await connectGmailAction()

    expect(result).toEqual({ error: "Not authenticated." })
  })
})

describe("GET /auth/callback — Unknown provider", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("redirects to /settings?error=unknown_provider for unknown state", async () => {
    const { GET } = await import("./route")
    const req = new Request(
      "http://localhost:3000/auth/callback?state=unknown"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=unknown_provider")
  })

  it("redirects to /settings?error=unknown_provider when state is missing", async () => {
    const { GET } = await import("./route")
    const req = new Request("http://localhost:3000/auth/callback")
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=unknown_provider")
  })
})
