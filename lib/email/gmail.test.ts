import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("fetchNewEmails (Gmail)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
  })

  it("returns empty array when no messages found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [] }),
    })

    const { fetchNewEmails } = await import("./gmail")
    const result = await fetchNewEmails(
      { access_token: "token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toEqual([])
    expect(result.newAccessToken).toBeUndefined()
  })

  it("returns emails when messages are found", async () => {
    // 1. List messages
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "msg1" }] }),
    })
    // 2. Fetch metadata for msg1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "msg1",
        payload: {
          headers: [
            { name: "Subject", value: "Test Subject" },
            { name: "From", value: "Alice <alice@example.com>" },
            { name: "Date", value: "Mon, 1 Jan 2026 10:00:00 +0000" },
          ],
        },
      }),
    })

    const { fetchNewEmails } = await import("./gmail")
    const result = await fetchNewEmails(
      { access_token: "token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0]).toMatchObject({
      providerEmailId: "msg1",
      subject: "Test Subject",
      fromEmail: "alice@example.com",
      fromName: "Alice",
    })
  })

  it("refreshes token on 401 and retries successfully", async () => {
    // 1. List messages — 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    // 2. Token refresh
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "new-token" }),
    })
    // 3. Retry list messages with new token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [] }),
    })

    const { fetchNewEmails } = await import("./gmail")
    const result = await fetchNewEmails(
      { access_token: "expired-token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toEqual([])
    expect(result.newAccessToken).toBe("new-token")
    // Verify token refresh was called
    const refreshCall = mockFetch.mock.calls[1]
    expect(refreshCall[0]).toBe("https://oauth2.googleapis.com/token")
  })

  it("throws if token refresh also fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })

    const { fetchNewEmails } = await import("./gmail")
    await expect(
      fetchNewEmails({ access_token: "token", refresh_token: "bad-refresh" }, null)
    ).rejects.toThrow("Gmail token refresh failed")
  })

  it("skips messages that fail metadata fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "msg1" }, { id: "msg2" }] }),
    })
    // msg1 metadata — success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "msg1",
        payload: {
          headers: [
            { name: "Subject", value: "Hello" },
            { name: "From", value: "bob@example.com" },
            { name: "Date", value: "Mon, 1 Jan 2026 10:00:00 +0000" },
          ],
        },
      }),
    })
    // msg2 metadata — 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

    const { fetchNewEmails } = await import("./gmail")
    const result = await fetchNewEmails(
      { access_token: "token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0].providerEmailId).toBe("msg1")
  })

  it("uses after filter when lastSyncedAt is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ messages: [] }),
    })

    const { fetchNewEmails } = await import("./gmail")
    const lastSync = new Date("2026-01-01T00:00:00Z")
    await fetchNewEmails({ access_token: "token", refresh_token: "refresh" }, lastSync)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("after")
  })
})
