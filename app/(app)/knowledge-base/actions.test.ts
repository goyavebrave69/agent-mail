import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

describe("uploadKbFileAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockUpload: ReturnType<typeof vi.fn>
  let mockRemove: ReturnType<typeof vi.fn>
  let mockInsert: ReturnType<typeof vi.fn>

  function makeFile(name: string, type: string, size: number): File {
    const blob = new Blob(["x".repeat(size)], { type })
    return new File([blob], name, { type })
  }

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    mockGetUser = vi.fn()
    mockUpload = vi.fn()
    mockRemove = vi.fn()
    mockInsert = vi.fn()

    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          remove: mockRemove,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      }),
    })
  })

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("data.csv", "text/csv", 100))

    const result = await uploadKbFileAction(formData)
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns error for unsupported mime type", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("image.png", "image/png", 100))

    const result = await uploadKbFileAction(formData)
    expect(result).toMatchObject({ error: expect.stringContaining("Unsupported file type") })
  })

  it("returns error when file exceeds 10 MB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    const bigFile = makeFile("huge.csv", "text/csv", 11 * 1024 * 1024)
    formData.set("file", bigFile)

    const result = await uploadKbFileAction(formData)
    expect(result).toMatchObject({ error: expect.stringContaining("too large") })
  })

  it("uploads valid CSV and inserts kb_files row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockUpload.mockResolvedValue({ error: null })
    mockInsert.mockResolvedValue({
      data: { id: "file-uuid", filename: "prices.csv", status: "pending" },
      error: null,
    })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("prices.csv", "text/csv", 1000))

    const result = await uploadKbFileAction(formData)
    expect(result).toEqual({ id: "file-uuid", filename: "prices.csv", status: "pending" })
    expect(mockUpload).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it("cleans up storage and returns error when db insert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockUpload.mockResolvedValue({ error: null })
    mockInsert.mockResolvedValue({ data: null, error: { message: "db error" } })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("data.csv", "text/csv", 500))

    const result = await uploadKbFileAction(formData)
    expect(result).toMatchObject({ error: expect.stringContaining("Failed to record file") })
    expect(mockRemove).toHaveBeenCalledOnce()
  })
})
