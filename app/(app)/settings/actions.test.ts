import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("imapflow", () => ({
  ImapFlow: vi.fn(),
}))

describe("connectImapAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockRpc: ReturnType<typeof vi.fn>
  let mockUpsert: ReturnType<typeof vi.fn>
  let mockImapConnect: ReturnType<typeof vi.fn>
  let mockImapLogout: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn()
    mockRpc = vi.fn()
    mockUpsert = vi.fn()
    mockImapConnect = vi.fn()
    mockImapLogout = vi.fn()

    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    const { createAdminClient } = await import("@/lib/supabase/admin")
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      rpc: mockRpc,
      from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
      auth: { admin: { deleteUser: vi.fn() } },
    })

    const { ImapFlow } = await import("imapflow")
    ;(ImapFlow as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      connect: mockImapConnect,
      logout: mockImapLogout,
    }))
  })

  const validParams = { host: "imap.example.com", port: 993, username: "user@example.com", password: "secret" }

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ error: "Not authenticated." })
    expect(mockImapConnect).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("returns IMAP_INVALID_INPUT when required fields are missing", async () => {
    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction({ host: "", port: 993, username: "user@example.com", password: "secret" })

    expect(result).toEqual({ error: "IMAP_INVALID_INPUT" })
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockImapConnect).not.toHaveBeenCalled()
  })

  it("returns IMAP_INVALID_INPUT when port is invalid", async () => {
    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction({ host: "imap.example.com", port: 25, username: "user@example.com", password: "secret" })

    expect(result).toEqual({ error: "IMAP_INVALID_INPUT" })
    expect(mockImapConnect).not.toHaveBeenCalled()
  })

  it("returns IMAP_AUTH_FAILED on authentication failure", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
    mockImapConnect.mockRejectedValue({ responseCode: "AUTHENTICATIONFAILED", message: "Auth failed" })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ error: "IMAP_AUTH_FAILED" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("returns IMAP_UNREACHABLE on connection refused/timeout", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
    mockImapConnect.mockRejectedValue({ code: "ECONNREFUSED", message: "Connection refused" })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ error: "IMAP_UNREACHABLE" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("stores credentials in vault and upserts connection on success", async () => {
    const userId = "user-123"
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
    mockImapConnect.mockResolvedValue(undefined)
    mockImapLogout.mockResolvedValue(undefined)
    mockRpc.mockResolvedValue({ data: "vault-secret-id-abc", error: null })
    mockUpsert.mockResolvedValue({ error: null })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ success: true })
    expect(mockRpc).toHaveBeenCalledWith("create_vault_secret", {
      secret: JSON.stringify({ host: validParams.host, port: validParams.port, username: validParams.username, password: validParams.password }),
      name: `imap:${userId}`,
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, provider: "imap", email: validParams.username, vault_secret_id: "vault-secret-id-abc" }),
      { onConflict: "user_id,provider" }
    )
  })

  it("returns IMAP_STORAGE_FAILED when vault RPC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
    mockImapConnect.mockResolvedValue(undefined)
    mockImapLogout.mockResolvedValue(undefined)
    mockRpc.mockResolvedValue({ data: null, error: { message: "vault down" } })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ error: "IMAP_STORAGE_FAILED" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("returns IMAP_STORAGE_FAILED when upsert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null })
    mockImapConnect.mockResolvedValue(undefined)
    mockImapLogout.mockResolvedValue(undefined)
    mockRpc.mockResolvedValue({ data: "vault-secret-id-abc", error: null })
    mockUpsert.mockResolvedValue({ error: { message: "db error" } })

    const { connectImapAction } = await import("./actions")
    const result = await connectImapAction(validParams)

    expect(result).toEqual({ error: "IMAP_STORAGE_FAILED" })
  })
})

describe("deleteAccountAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockDeleteUser: ReturnType<typeof vi.fn>
  let mockRedirect: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const nav = await import("next/navigation")
    mockRedirect = nav.redirect as unknown as ReturnType<typeof vi.fn>

    mockGetUser = vi.fn()
    mockDeleteUser = vi.fn()

    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
    })

    const { createAdminClient } = await import("@/lib/supabase/admin")
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { admin: { deleteUser: mockDeleteUser } },
    })
  })

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { deleteAccountAction } = await import("./actions")
    const result = await deleteAccountAction()

    expect(result).toEqual({ error: "Not authenticated." })
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("deletes auth user and redirects to / on success", async () => {
    const userId = "user-123"
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    })
    mockDeleteUser.mockResolvedValue({ data: {}, error: null })

    const { deleteAccountAction } = await import("./actions")
    await deleteAccountAction()

    expect(mockDeleteUser).toHaveBeenCalledWith(userId)
    expect(mockRedirect).toHaveBeenCalledWith("/")
  })

  it("returns error when Admin API fails without redirecting", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })
    mockDeleteUser.mockResolvedValue({
      data: null,
      error: { message: "Admin error" },
    })

    const { deleteAccountAction } = await import("./actions")
    const result = await deleteAccountAction()

    expect(result).toEqual({
      error: "Unable to delete account. Please try again.",
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("returns error when deletion throws unexpectedly", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })
    mockDeleteUser.mockRejectedValue(new Error("Network error"))

    const { deleteAccountAction } = await import("./actions")
    const result = await deleteAccountAction()

    expect(result).toEqual({
      error: "Unable to delete account. Please try again.",
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
