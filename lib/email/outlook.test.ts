import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("fetchNewEmails (Outlook)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockFetch.mockReset()
    process.env.MICROSOFT_CLIENT_ID = "test-client-id"
    process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret"
  })

  it("returns empty array when no messages found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    })

    const { fetchNewEmails } = await import("./outlook")
    const result = await fetchNewEmails(
      { access_token: "token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toEqual([])
    expect(result.newAccessToken).toBeUndefined()
  })

  it("returns emails when messages are found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        value: [
          {
            id: "out-msg1",
            subject: "Outlook Subject",
            from: { emailAddress: { name: "Bob", address: "bob@outlook.com" } },
            receivedDateTime: "2026-01-01T10:00:00Z",
          },
        ],
      }),
    })

    const { fetchNewEmails } = await import("./outlook")
    const result = await fetchNewEmails(
      { access_token: "token", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0]).toMatchObject({
      providerEmailId: "out-msg1",
      subject: "Outlook Subject",
      fromEmail: "bob@outlook.com",
      fromName: "Bob",
    })
  })

  it("refreshes token on 401 and retries", async () => {
    // 1. List — 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    // 2. Token refresh
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "new-outlook-token" }),
    })
    // 3. Retry list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    })

    const { fetchNewEmails } = await import("./outlook")
    const result = await fetchNewEmails(
      { access_token: "expired", refresh_token: "refresh" },
      null
    )

    expect(result.emails).toEqual([])
    expect(result.newAccessToken).toBe("new-outlook-token")
  })

  it("throws if token refresh fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })

    const { fetchNewEmails } = await import("./outlook")
    await expect(
      fetchNewEmails({ access_token: "token", refresh_token: "bad" }, null)
    ).rejects.toThrow("Outlook token refresh failed")
  })

  it("uses date filter when lastSyncedAt is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ value: [] }),
    })

    const { fetchNewEmails } = await import("./outlook")
    const lastSync = new Date("2026-01-01T00:00:00Z")
    await fetchNewEmails({ access_token: "token", refresh_token: "refresh" }, lastSync)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("$filter=receivedDateTime")
  })
})
