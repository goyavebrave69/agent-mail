import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
    process.env.OPENAI_API_KEY = "test-openai-key"
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it("returns a number[] of length 1536 on success", async () => {
    const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i / 1536)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
    })

    const { generateEmbedding } = await import("./embeddings")
    const result = await generateEmbedding("hello world")

    expect(result).toHaveLength(1536)
    expect(result[0]).toBeCloseTo(0)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.openai.com/v1/embeddings")
    expect(JSON.parse(options.body as string)).toMatchObject({
      model: "text-embedding-ada-002",
      input: "hello world",
    })
  })

  it("throws a descriptive error on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "rate limit exceeded",
    })

    const { generateEmbedding } = await import("./embeddings")
    await expect(generateEmbedding("text")).rejects.toThrow("OpenAI embeddings API error 429")
  })

  it("throws if OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY

    const { generateEmbedding } = await import("./embeddings")
    await expect(generateEmbedding("text")).rejects.toThrow("OPENAI_API_KEY is not configured")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
