import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRevalidatePath = vi.fn()
const mockCreateClient = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

describe("createCustomCategoryAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockMaybeSingle: ReturnType<typeof vi.fn>
  let mockInsert: ReturnType<typeof vi.fn>
  let mockInsertSingle: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    mockInsertSingle = vi.fn().mockResolvedValue({
      data: { id: "cat-1", name: "VIP Clients", slug: "vip_clients" },
      error: null,
    })
    mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockInsertSingle,
      }),
    })

    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
        insert: mockInsert,
      }),
    })
  })

  it("returns Unauthorized when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("VIP")

    expect(result).toEqual({ success: false, error: "Unauthorized" })
  })

  it("validates empty category names", async () => {
    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("   ")

    expect(result).toEqual({ success: false, error: "Category name is required." })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("validates max category name length", async () => {
    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("x".repeat(41))

    expect(result).toEqual({
      success: false,
      error: "Category name must be 40 characters or fewer.",
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("blocks duplicates against system categories", async () => {
    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("Quote")

    expect(result).toEqual({ success: false, error: "Category already exists." })
    expect(mockMaybeSingle).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("blocks duplicates already persisted for the user", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "cat-existing" }, error: null })

    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("VIP Clients")

    expect(result).toEqual({ success: false, error: "Category already exists." })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("normalizes, persists category, and revalidates inbox", async () => {
    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("  VIP   Clients  ")

    expect(result).toEqual({
      success: true,
      category: {
        id: "cat-1",
        name: "VIP Clients",
        slug: "vip_clients",
      },
    })
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "VIP Clients",
      slug: "vip_clients",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/inbox")
  })

  it("returns duplicate error when insert hits unique constraint", async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: "23505" },
    })

    const { createCustomCategoryAction } = await import("./actions")
    const result = await createCustomCategoryAction("Priority")

    expect(result).toEqual({ success: false, error: "Category already exists." })
  })
})
