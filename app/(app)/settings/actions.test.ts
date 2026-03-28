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
