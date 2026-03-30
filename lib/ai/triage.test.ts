import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("triageEmail", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
    process.env.OPENAI_API_KEY = "test-openai-key"
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  function mockLlmResponse(category: string) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ category }) } }],
      }),
    })
  }

  it("returns quote category with priority 100 for a quote request email", async () => {
    mockLlmResponse("quote")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Price request for 50 units", "buyer@example.com", "test-key")
    expect(result.category).toBe("quote")
    expect(result.priorityRank).toBe(100)
  })

  it("returns invoice category with priority 90", async () => {
    mockLlmResponse("invoice")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Invoice #1234 attached", "billing@acme.com", "test-key")
    expect(result.category).toBe("invoice")
    expect(result.priorityRank).toBe(90)
  })

  it("returns inquiry category with priority 70", async () => {
    mockLlmResponse("inquiry")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Question about your services", "client@example.com", "test-key")
    expect(result.category).toBe("inquiry")
    expect(result.priorityRank).toBe(70)
  })

  it("falls back to other/20 when LLM returns unexpected JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json {{" } }],
      }),
    })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", "test-key")
    expect(result).toEqual({ category: "other", priorityRank: 20 })
  })

  it("falls back to other/20 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"))
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", "test-key")
    expect(result).toEqual({ category: "other", priorityRank: 20 })
  })

  it("falls back to other/20 when LLM returns non-200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "rate limit exceeded",
    })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", "test-key")
    expect(result).toEqual({ category: "other", priorityRank: 20 })
  })

  it("falls back to other/20 when LLM returns an unknown category", async () => {
    mockLlmResponse("unknown_category")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", "test-key")
    expect(result).toEqual({ category: "other", priorityRank: 20 })
  })
})
