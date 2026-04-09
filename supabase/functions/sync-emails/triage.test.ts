import { describe, it, expect, vi, beforeEach } from "vitest"
import type { UserCategory } from "./triage"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const CATEGORIES: UserCategory[] = [
  { slug: "devis", name: "Devis", description: "Demandes de devis ou d'estimation" },
  { slug: "support", name: "Support", description: "Questions techniques" },
  { slug: "inbox", name: "Inbox", description: null },
]

function mockLlmJson(payload: object) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  })
}

function mockLlmError() {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "" })
}

describe("triageEmail", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it("returns FALLBACK when no categories are provided", async () => {
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Subject", "from@example.com", "body", [], "api-key")
    expect(result.category).toBe("inbox")
    expect(result.responseType).toBe("text_reply")
  })

  it("returns FALLBACK when API key is empty", async () => {
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Subject", "from@example.com", "body", CATEGORIES, "  ")
    expect(result.category).toBe("inbox")
    expect(result.responseType).toBe("text_reply")
  })

  it("returns correct category and text_reply response type", async () => {
    mockLlmJson({ category: "support", response_type: "text_reply" })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Bug in my account", "user@example.com", "I need help.", CATEGORIES, "key")
    expect(result.category).toBe("support")
    expect(result.responseType).toBe("text_reply")
    expect(result.priorityRank).toBeGreaterThan(0)
  })

  it("returns pdf_required when LLM detects a quote request", async () => {
    mockLlmJson({ category: "devis", response_type: "pdf_required" })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Demande de devis", "prospect@example.com", "Pouvez-vous me faire un devis ?", CATEGORIES, "key")
    expect(result.category).toBe("devis")
    expect(result.responseType).toBe("pdf_required")
  })

  it("falls back to text_reply when response_type is missing", async () => {
    mockLlmJson({ category: "support" })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Question", "user@example.com", "body", CATEGORIES, "key")
    expect(result.responseType).toBe("text_reply")
  })

  it("returns FALLBACK when LLM returns an unknown slug", async () => {
    mockLlmJson({ category: "unknown-slug", response_type: "text_reply" })
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Subject", "from@example.com", "body", CATEGORIES, "key")
    expect(result.category).toBe("inbox")
    expect(result.responseType).toBe("text_reply")
  })

  it("returns FALLBACK on API error", async () => {
    mockLlmError()
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Subject", "from@example.com", "body", CATEGORIES, "key")
    expect(result.category).toBe("inbox")
    expect(result.responseType).toBe("text_reply")
  })

  it("returns FALLBACK when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network failure"))
    const { triageEmail } = await import("./triage")
    const result = await triageEmail("Subject", "from@example.com", "body", CATEGORIES, "key")
    expect(result.category).toBe("inbox")
    expect(result.responseType).toBe("text_reply")
  })

  it("assigns higher priorityRank to categories listed first", async () => {
    mockLlmJson({ category: "devis", response_type: "pdf_required" })
    const { triageEmail } = await import("./triage")
    const result1 = await triageEmail("Devis", "p@example.com", "body", CATEGORIES, "key")

    mockLlmJson({ category: "inbox", response_type: "text_reply" })
    const result2 = await triageEmail("Other", "p@example.com", "body", CATEGORIES, "key")

    expect(result1.priorityRank).toBeGreaterThan(result2.priorityRank)
  })
})
