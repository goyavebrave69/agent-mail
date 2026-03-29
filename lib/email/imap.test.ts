import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("imapflow", () => ({
  ImapFlow: vi.fn(),
}))

describe("fetchNewEmails (IMAP)", () => {
  let mockConnect: ReturnType<typeof vi.fn>
  let mockGetMailboxLock: ReturnType<typeof vi.fn>
  let mockSearch: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>
  let mockLogout: ReturnType<typeof vi.fn>
  let mockLockRelease: ReturnType<typeof vi.fn>

  const credentials = {
    host: "imap.example.com",
    port: 993 as const,
    username: "user@example.com",
    password: "secret",
  }

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    mockConnect = vi.fn()
    mockSearch = vi.fn()
    mockLogout = vi.fn()
    mockLockRelease = vi.fn()
    mockFetch = vi.fn()
    mockGetMailboxLock = vi.fn().mockResolvedValue({ release: mockLockRelease })

    const { ImapFlow } = await import("imapflow")
    vi.mocked(ImapFlow).mockImplementation(() => ({
      connect: mockConnect,
      getMailboxLock: mockGetMailboxLock,
      search: mockSearch,
      fetch: mockFetch,
      logout: mockLogout,
    }) as never)
  })

  it("returns empty array when no UIDs found", async () => {
    mockConnect.mockResolvedValue(undefined)
    mockSearch.mockResolvedValue([])
    mockFetch.mockReturnValue((async function* () {})())

    const { fetchNewEmails } = await import("./imap")
    const result = await fetchNewEmails(credentials, null)

    expect(result.emails).toEqual([])
  })

  it("returns emails with envelope data", async () => {
    mockConnect.mockResolvedValue(undefined)
    mockSearch.mockResolvedValue([1])
    mockFetch.mockReturnValue(
      (async function* () {
        yield {
          uid: 1,
          envelope: {
            messageId: "<msg1@example.com>",
            subject: "IMAP Test",
            from: [{ name: "Carol", address: "carol@example.com" }],
            date: new Date("2026-01-01T10:00:00Z"),
          },
        }
      })()
    )
    mockLogout.mockResolvedValue(undefined)

    const { fetchNewEmails } = await import("./imap")
    const result = await fetchNewEmails(credentials, null)

    expect(result.emails).toHaveLength(1)
    expect(result.emails[0]).toMatchObject({
      providerEmailId: "<msg1@example.com>",
      subject: "IMAP Test",
      fromEmail: "carol@example.com",
      fromName: "Carol",
    })
  })

  it("throws on connection failure (auth error)", async () => {
    mockConnect.mockRejectedValue(new Error("Authentication failed"))

    const { fetchNewEmails } = await import("./imap")
    await expect(fetchNewEmails(credentials, null)).rejects.toThrow("Authentication failed")
  })

  it("uses SINCE search when lastSyncedAt is provided", async () => {
    mockConnect.mockResolvedValue(undefined)
    mockSearch.mockResolvedValue([])
    mockFetch.mockReturnValue((async function* () {})())

    const { fetchNewEmails } = await import("./imap")
    const lastSync = new Date("2026-01-01T00:00:00Z")
    await fetchNewEmails(credentials, lastSync)

    expect(mockSearch).toHaveBeenCalledWith({ since: lastSync })
  })

  it("falls back to uid as providerEmailId when messageId is missing", async () => {
    mockConnect.mockResolvedValue(undefined)
    mockSearch.mockResolvedValue([42])
    mockFetch.mockReturnValue(
      (async function* () {
        yield {
          uid: 42,
          envelope: {
            messageId: undefined,
            subject: "No ID",
            from: [{ address: "noid@example.com" }],
            date: new Date("2026-01-01T10:00:00Z"),
          },
        }
      })()
    )
    mockLogout.mockResolvedValue(undefined)

    const { fetchNewEmails } = await import("./imap")
    const result = await fetchNewEmails(credentials, null)

    expect(result.emails[0].providerEmailId).toBe("42")
  })
})
