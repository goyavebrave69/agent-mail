import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
const mockRevalidatePath = vi.fn()
vi.stubGlobal("fetch", mockFetch)

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}))

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
    mockFetch.mockReset()
    // Default: fire-and-forget fetch resolves silently
    mockFetch.mockResolvedValue({ ok: true })

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

  it("accepts csv extension when MIME type is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockUpload.mockResolvedValue({ error: null })
    mockInsert.mockResolvedValue({
      data: { id: "file-uuid", filename: "prices.csv", status: "pending" },
      error: null,
    })

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("prices.csv", "", 1000))

    const result = await uploadKbFileAction(formData)
    expect(result).toEqual({ id: "file-uuid", filename: "prices.csv", status: "pending" })
    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(File),
      expect.objectContaining({ contentType: "text/csv", upsert: false })
    )
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

  it("triggers index-kb Edge Function after successful upload", async () => {
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
    expect(result).toMatchObject({ id: "file-uuid" })

    // Allow the fire-and-forget fetch to be scheduled
    await new Promise((r) => setTimeout(r, 0))
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/functions/v1/index-kb")
    expect(JSON.parse(opts.body as string)).toEqual({ kb_file_id: "file-uuid" })
  })

  it("returns success even if index-kb trigger fetch fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockUpload.mockResolvedValue({ error: null })
    mockInsert.mockResolvedValue({
      data: { id: "file-uuid", filename: "data.csv", status: "pending" },
      error: null,
    })
    mockFetch.mockRejectedValue(new Error("network error"))

    const { uploadKbFileAction } = await import("./actions")
    const formData = new FormData()
    formData.set("file", makeFile("data.csv", "text/csv", 500))

    const result = await uploadKbFileAction(formData)
    expect(result).toMatchObject({ id: "file-uuid", status: "pending" })
  })
})

describe("retriggerIndexKbAction", () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let mockSelect: ReturnType<typeof vi.fn>
  let mockUpdateSelect: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true })

    mockGetUser = vi.fn()
    mockSelect = vi.fn()
    mockUpdateSelect = vi.fn()

    const { createClient } = await import("@/lib/supabase/server")
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSelect,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: mockUpdateSelect,
            }),
          }),
        }),
      }),
    })
  })

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { retriggerIndexKbAction } = await import("./actions")
    const result = await retriggerIndexKbAction("file-uuid")
    expect(result).toEqual({ error: "Unauthorized" })
  })

  it("returns error when file not found or belongs to different user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockSelect.mockResolvedValue({ data: null, error: { message: "not found" } })

    const { retriggerIndexKbAction } = await import("./actions")
    const result = await retriggerIndexKbAction("file-uuid")
    expect(result).toEqual({ error: "Not found" })
  })

  it("returns error when file status is not error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockSelect.mockResolvedValue({
      data: { id: "file-uuid", user_id: "user-1", status: "ready" },
      error: null,
    })

    const { retriggerIndexKbAction } = await import("./actions")
    const result = await retriggerIndexKbAction("file-uuid")
    expect(result).toEqual({ error: "File is not in error state" })
  })

  it("resets status to pending, fires fetch, returns success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockSelect.mockResolvedValue({
      data: { id: "file-uuid", user_id: "user-1", status: "error" },
      error: null,
    })
    mockUpdateSelect.mockResolvedValue({
      data: [{ id: "file-uuid", status: "pending" }],
      error: null,
    })

    const { retriggerIndexKbAction } = await import("./actions")
    const result = await retriggerIndexKbAction("file-uuid")
    expect(result).toEqual({ success: true })

    await new Promise((r) => setTimeout(r, 0))
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/functions/v1/index-kb")
    expect(JSON.parse(opts.body as string)).toEqual({ kb_file_id: "file-uuid" })
  })

  it("returns success even if index-kb trigger fetch fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockSelect.mockResolvedValue({
      data: { id: "file-uuid", user_id: "user-1", status: "error" },
      error: null,
    })
    mockUpdateSelect.mockResolvedValue({
      data: [{ id: "file-uuid", status: "pending" }],
      error: null,
    })
    mockFetch.mockRejectedValue(new Error("network error"))

    const { retriggerIndexKbAction } = await import("./actions")
    const result = await retriggerIndexKbAction("file-uuid")
    expect(result).toEqual({ success: true })
  })
})
