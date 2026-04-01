import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const TEST_API_KEY = "test-openai-key"

const KB_CHUNKS = [
  { content: "We offer free shipping on orders above $50.", similarity: 0.92 },
  { content: "Our return policy is 30 days, no questions asked.", similarity: 0.85 },
]

function mockLlmSuccess(content: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  })
}

function mockLlmError(status: number, body = "error") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
  })
}

describe("generateDraft", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it("returns generated draft content and confidence score when LLM call succeeds", async () => {
    mockLlmSuccess("Thank you for your inquiry. We offer free shipping on orders above $50.")
    const { generateDraft } = await import("./draft")
    const result = await generateDraft(
      "Shipping question",
      "customer@example.com",
      KB_CHUNKS,
      TEST_API_KEY
    )
    expect("error" in result).toBe(false)
    if (!("error" in result)) {
      expect(result.content).toContain("free shipping")
      expect(result.confidenceScore).toBeGreaterThan(0)
      expect(result.confidenceScore).toBeLessThanOrEqual(100)
    }
  })

  it("returns error with retryable: true when a network error occurs", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"))
    const { generateDraft } = await import("./draft")
    const result = await generateDraft("Subject", "from@example.com", KB_CHUNKS, TEST_API_KEY)
    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.retryable).toBe(true)
      expect(result.error).toMatch(/network error/i)
    }
  })

  it("returns error with retryable: false when quota is exceeded (HTTP 429)", async () => {
    mockLlmError(429, "quota exceeded")
    const { generateDraft } = await import("./draft")
    const result = await generateDraft("Subject", "from@example.com", KB_CHUNKS, TEST_API_KEY)
    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.retryable).toBe(false)
    }
  })

  it("calculates higher confidence score when KB chunks have high similarity", async () => {
    const highSimChunks = [
      { content: "Relevant content A", similarity: 0.95 },
      { content: "Relevant content B", similarity: 0.98 },
    ]
    mockLlmSuccess("Here is the draft reply.")
    const { generateDraft } = await import("./draft")
    const result = await generateDraft("Clear subject with detail", null, highSimChunks, TEST_API_KEY)
    if (!("error" in result)) {
      // base 50 + up to 30 (avg 0.965 * 30 ≈ 29) + up to 20 (long subject) = ~99
      expect(result.confidenceScore).toBeGreaterThan(75)
    }
  })

  it("includes tone and language preferences in the generated prompt", async () => {
    mockLlmSuccess("Voici le brouillon de réponse.")
    const { generateDraft } = await import("./draft")
    await generateDraft("Sujet", "exp@example.com", KB_CHUNKS, TEST_API_KEY, {
      tone: "informal",
      language: "French",
    })
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: string }>
    }
    const systemMsg = body.messages.find(m => m.role === "system")?.content ?? ""
    expect(systemMsg).toMatch(/French/i)
    expect(systemMsg).toMatch(/friendly and informal/i)
  })

  it("includes the instruction parameter in the user message for regeneration", async () => {
    mockLlmSuccess("Updated draft with instruction.")
    const { generateDraft } = await import("./draft")
    await generateDraft("Subject", "from@example.com", KB_CHUNKS, TEST_API_KEY, {
      instruction: "Be more concise and focus on the return policy.",
    })
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(options.body as string) as {
      messages: Array<{ role: string; content: string }>
    }
    const userMsg = body.messages.find(m => m.role === "user")?.content ?? ""
    expect(userMsg).toContain("Be more concise and focus on the return policy.")
  })

  it("returns error with retryable: true for 5xx server errors", async () => {
    mockLlmError(503, "Service unavailable")
    const { generateDraft } = await import("./draft")
    const result = await generateDraft("Subject", "from@example.com", KB_CHUNKS, TEST_API_KEY)
    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.retryable).toBe(true)
    }
  })
})
