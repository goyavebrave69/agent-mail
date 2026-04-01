import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkUserLlmQuota } from "./throttle"

function makeSupabase(rows: Array<{ call_count: number; reset_at: string }> | null, error: { message: string } | null = null) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error }),
      }),
      upsert: upsertMock,
      update: updateMock,
    }),
    _upsertMock: upsertMock,
    _updateMock: updateMock,
  }
}

describe("checkUserLlmQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns allowed: true when user has no usage record (first call)", async () => {
    const supabase = makeSupabase([])
    const result = await checkUserLlmQuota("user-1", supabase as never)
    expect(result.allowed).toBe(true)
  })

  it("returns allowed: true when user is under the daily limit", async () => {
    const now = new Date()
    const supabase = makeSupabase([{ call_count: 50, reset_at: now.toISOString() }])
    const result = await checkUserLlmQuota("user-1", supabase as never)
    expect(result.allowed).toBe(true)
  })

  it("returns allowed: false when user has exceeded the daily limit (100 calls)", async () => {
    const now = new Date()
    const supabase = makeSupabase([{ call_count: 100, reset_at: now.toISOString() }])
    const result = await checkUserLlmQuota("user-1", supabase as never)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/quota exceeded/i)
  })

  it("resets counter and returns allowed: true after 24 hours", async () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000)
    const supabase = makeSupabase([{ call_count: 100, reset_at: yesterday.toISOString() }])
    const result = await checkUserLlmQuota("user-1", supabase as never)
    expect(result.allowed).toBe(true)
    expect(supabase._updateMock).toHaveBeenCalled()
  })

  it("returns allowed: true (fail open) on DB error", async () => {
    const supabase = makeSupabase(null, { message: "connection refused" })
    const result = await checkUserLlmQuota("user-1", supabase as never)
    expect(result.allowed).toBe(true)
  })
})
