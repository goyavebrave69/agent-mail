import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/navigation redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

describe("loginAction", () => {
  let mockSignInWithPassword: ReturnType<typeof vi.fn>
  let mockRedirect: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    const nav = await import("next/navigation")
    mockRedirect = nav.redirect as unknown as ReturnType<typeof vi.fn>

    mockSignInWithPassword = vi.fn()
    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
      },
    })
  })

  it("redirects to /onboarding/connect-mailbox on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { loginAction } = await import("./actions")
    const formData = new FormData()
    formData.set("email", "user@example.com")
    formData.set("password", "password123")

    const result = await loginAction(formData)

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    })
    expect(mockRedirect).toHaveBeenCalledWith("/onboarding/connect-mailbox")
    expect(result).toBeUndefined()
  })

  it("returns generic error message on invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    })

    const { loginAction } = await import("./actions")
    const formData = new FormData()
    formData.set("email", "user@example.com")
    formData.set("password", "wrongpassword")

    const result = await loginAction(formData)

    expect(result).toEqual({ error: "Invalid credentials. Please try again." })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("returns validation error when email is missing", async () => {
    const { loginAction } = await import("./actions")
    const formData = new FormData()
    formData.set("password", "password123")

    const result = await loginAction(formData)

    expect(result).toEqual({ error: "Email and password are required." })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it("returns validation error when password is missing", async () => {
    const { loginAction } = await import("./actions")
    const formData = new FormData()
    formData.set("email", "user@example.com")

    const result = await loginAction(formData)

    expect(result).toEqual({ error: "Email and password are required." })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })
})
