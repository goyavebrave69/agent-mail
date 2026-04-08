import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { UserCategory } from "./triage"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const CATEGORIES: UserCategory[] = [
  { slug: "client-vip", name: "Client VIP", description: "Important clients requiring fast response" },
  { slug: "prospect", name: "Prospect", description: "Potential new customers" },
  { slug: "supplier", name: "Supplier", description: "Invoices and supplier communications" },
]

describe("triageEmail", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  function mockLlmResponse(slug: string) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ category: slug }) } }],
      }),
    })
  }

  it("returns correct slug and priority for first category", async () => {
    mockLlmResponse("client-vip")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Urgent request from top client", "vip@example.com", CATEGORIES, "test-key")
    expect(result.category).toBe("client-vip")
    expect(result.priorityRank).toBe(30) // (3 - 0) * 10
  })

  it("returns correct slug and priority for last category", async () => {
    mockLlmResponse("supplier")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Invoice #1234", "billing@supplier.com", CATEGORIES, "test-key")
    expect(result.category).toBe("supplier")
    expect(result.priorityRank).toBe(10) // (3 - 2) * 10
  })

  it("falls back to inbox/0 when no user categories are provided", async () => {
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", [], "test-key")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("falls back to inbox/0 when LLM returns unknown slug", async () => {
    mockLlmResponse("hallucinated-category")
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", CATEGORIES, "test-key")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
  })

  it("falls back to inbox/0 when LLM returns invalid JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not valid json {{" } }],
      }),
    })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", CATEGORIES, "test-key")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
  })

  it("falls back to inbox/0 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"))
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", CATEGORIES, "test-key")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
  })

  it("falls back to inbox/0 and skips fetch when API key is missing", async () => {
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", CATEGORIES, "   ")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("falls back to inbox/0 when LLM returns non-200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "rate limit exceeded",
    })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Some email", "test@example.com", CATEGORIES, "test-key")
    expect(result).toEqual({ category: "inbox", priorityRank: 0 })
  })

  it("includes category descriptions in the prompt", async () => {
    mockLlmResponse("client-vip")
    const { triageEmail } = await import("./triage")
    await triageEmail("Hello", "a@b.com", CATEGORIES, "test-key")
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    const systemPrompt = body.messages[0].content as string
    expect(systemPrompt).toContain("client-vip")
    expect(systemPrompt).toContain("Important clients requiring fast response")
  })
})
