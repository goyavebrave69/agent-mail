import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSignUp = vi.fn()
const mockRedirect = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
    },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

let signUpAction: typeof import("./actions").signUpAction

describe("signUpAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import("./actions")
    signUpAction = mod.signUpAction
  })

  it("redirects to /verify-email on successful signup", async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const formData = new FormData()
    formData.append("email", "test@example.com")
    formData.append("password", "password123")

    await signUpAction(formData)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining(
          "/auth/confirm?next=/onboarding/connect-mailbox",
        ),
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith("/verify-email")
  })

  it("returns structured error when Supabase returns an error", async () => {
    mockSignUp.mockResolvedValue({
      error: { message: "Invalid email format" },
    })
    const formData = new FormData()
    formData.append("email", "bad-email")
    formData.append("password", "password123")

    const result = await signUpAction(formData)

    expect(result).toEqual({ error: "Invalid email format" })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("returns generic message for already-registered email errors", async () => {
    // This path is triggered only when Supabase email confirmation is disabled
    // (e.g. local dev). With confirmation enabled, Supabase returns success + no
    // error to prevent enumeration — the user lands on /verify-email either way.
    mockSignUp.mockResolvedValue({
      error: { message: "User already registered" },
    })
    const formData = new FormData()
    formData.append("email", "existing@example.com")
    formData.append("password", "password123")

    const result = await signUpAction(formData)

    expect(result).toEqual({
      error:
        "If this email is not registered, you will receive a confirmation email.",
    })
  })

  it("returns error when email or password is missing", async () => {
    const formData = new FormData()
    const result = await signUpAction(formData)
    expect(result).toEqual({ error: "Email and password are required." })
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})
