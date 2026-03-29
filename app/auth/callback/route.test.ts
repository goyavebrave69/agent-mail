import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/auth/callback")
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /auth/callback — Gmail OAuth", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockInsert: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Environment variables
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"

    // Supabase server client — returns authenticated user
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })
    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    // Supabase admin client — vault.secrets insert + email_connections insert
    mockInsert = vi.fn()
    const { createAdminClient } = await import("@/lib/supabase/admin")

    // vault schema insert returns { id: "vault-secret-id-abc" }
    const mockVaultInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "vault-secret-id-abc" }, error: null }),
      }),
    })
    // email_connections insert
    mockInsert = vi.fn().mockResolvedValue({ error: null })

    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ insert: mockVaultInsert }),
      }),
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    })

    // Global fetch — token exchange then Gmail profile
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
    const req = new Request(
      "http://localhost:3000/auth/callback?state=gmail&code=auth-code-123"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?connected=gmail")

    // DB write happened with correct data
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-123",
      provider: "gmail",
      email: "user@gmail.com",
      vault_secret_id: "vault-secret-id-abc",
    }))
  })

  it("redirects to /settings?error=gmail_denied when user denies OAuth", async () => {
    const { GET } = await import("./route")
    const req = new Request(
      "http://localhost:3000/auth/callback?state=gmail&error=access_denied"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=gmail_denied")

    // No DB writes
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("redirects to /settings?error=gmail_failed when token exchange fails", async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({ ok: false } as Response)
    vi.stubGlobal("fetch", mockFetch)

    const { GET } = await import("./route")
    const req = new Request(
      "http://localhost:3000/auth/callback?state=gmail&code=bad-code"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=gmail_failed")

    // No DB writes
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("redirects to /settings?error=unknown_provider for unknown provider", async () => {
    const { GET } = await import("./route")
    const req = new Request(
      "http://localhost:3000/auth/callback?state=unknown"
    )
    const response = await GET(req as never)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/settings?error=unknown_provider")
  })
})

// ── connectGmailAction tests ─────────────────────────────────────────────────

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
    }
  })

  it("returns an error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { connectGmailAction } = await import("@/app/(app)/settings/actions")
    const result = await connectGmailAction()

    expect(result).toEqual({ error: "Not authenticated." })
  })
})
