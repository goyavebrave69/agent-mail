import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSignOut = vi.fn()
const mockRedirect = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

let logoutAction: typeof import("./actions").logoutAction

describe("logoutAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import("./actions")
    logoutAction = mod.logoutAction
  })

  it("redirects to /login when sign out succeeds", async () => {
    mockSignOut.mockResolvedValue({ error: null })

    await logoutAction()

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("returns structured error when sign out fails", async () => {
    mockSignOut.mockResolvedValue({
      error: { message: "Service unavailable" },
    })

    const result = await logoutAction()

    expect(result).toEqual({ error: "Unable to log out. Please try again." })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
