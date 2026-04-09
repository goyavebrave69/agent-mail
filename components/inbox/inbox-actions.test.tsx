import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { InboxShell } from "./inbox-shell"
import type { InboxEmail } from "@/app/(app)/inbox/page"

const { mockArchiveEmail, mockTrashEmail, mockStartComposing, mockRefresh } = vi.hoisted(() => ({
  mockArchiveEmail: vi.fn(),
  mockTrashEmail: vi.fn(),
  mockStartComposing: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: (cb?: (s: string) => void) => { cb?.("SUBSCRIBED"); return {} },
      }),
    }),
    removeChannel: vi.fn(),
  }),
}))

vi.mock("@/app/(app)/inbox/[emailId]/actions", () => ({
  fetchDraftForEmail: vi.fn().mockResolvedValue(null),
  archiveEmail: mockArchiveEmail,
  trashEmail: mockTrashEmail,
  createDraftOnDemand: vi.fn(),
  validateAndSendDraft: vi.fn(),
  rejectDraft: vi.fn(),
  sendManualReply: vi.fn(),
}))

vi.mock("@/app/(app)/inbox/actions", () => ({
  createCustomCategoryAction: vi.fn(),
}))

vi.mock("@/components/draft/draft-section", () => ({
  DraftSection: () => <div data-testid="draft-section" />,
}))

vi.mock("@/stores/draft-store", () => ({
  useDraftStore: vi.fn((selector: (s: { reset: () => void; startComposing: () => void }) => unknown) =>
    selector({ reset: vi.fn(), startComposing: mockStartComposing })
  ),
}))

const baseEmail: InboxEmail = {
  id: "email-1",
  subject: "Test Subject",
  from_email: "sender@example.com",
  from_name: "Test Sender",
  received_at: new Date().toISOString(),
  is_read: false,
  is_archived: false,
  category: "inquiry",
  priority_rank: 1,
  body_text: "Body text",
  body_html: null,
  response_type: 'text_reply' as const,
}

const defaultProps = {
  emails: [baseEmail],
  userId: "user-1",
  activeCategory: null as null,
  customCategories: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

// ─── Archive ──────────────────────────────────────────────────────────────────

describe("InboxShell — Archive action", () => {
  it("calls archiveEmail with the selected email id", async () => {
    mockArchiveEmail.mockResolvedValue({ success: true })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /archive/i }))

    await waitFor(() => {
      expect(mockArchiveEmail).toHaveBeenCalledWith("email-1")
    })
  })

  it("calls router.refresh after successful archive", async () => {
    mockArchiveEmail.mockResolvedValue({ success: true })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /archive/i }))
    fireEvent.click(screen.getByRole("button", { name: /archive/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("shows error message when archive fails", async () => {
    mockArchiveEmail.mockResolvedValue({ success: false, error: "Archive failed." })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /archive/i }))
    fireEvent.click(screen.getByRole("button", { name: /archive/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Archive failed.")).toBeInTheDocument()
    })
  })

  it("disables Archive button while action is in progress", async () => {
    mockArchiveEmail.mockImplementation(() => new Promise(() => {}))
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /archive/i }))
    fireEvent.click(screen.getByRole("button", { name: /archive/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /archive/i })).toBeDisabled()
    })
  })
})

// ─── Trash ────────────────────────────────────────────────────────────────────

describe("InboxShell — Trash action", () => {
  it("calls trashEmail with the selected email id", async () => {
    mockTrashEmail.mockResolvedValue({ success: true })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /trash/i }))
    fireEvent.click(screen.getByRole("button", { name: /trash/i }))

    await waitFor(() => {
      expect(mockTrashEmail).toHaveBeenCalledWith("email-1")
    })
  })

  it("calls router.refresh after successful trash", async () => {
    mockTrashEmail.mockResolvedValue({ success: true })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /trash/i }))
    fireEvent.click(screen.getByRole("button", { name: /trash/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("shows error message when trash fails", async () => {
    mockTrashEmail.mockResolvedValue({ success: false, error: "Trash failed." })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /trash/i }))
    fireEvent.click(screen.getByRole("button", { name: /trash/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Trash failed.")).toBeInTheDocument()
    })
  })
})

// ─── Reply / compose ──────────────────────────────────────────────────────────

describe("InboxShell — Reply action", () => {
  it("triggers startComposing when Reply is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /^reply$/i }))
    fireEvent.click(screen.getByRole("button", { name: /^reply$/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })

  it("triggers startComposing when Reply All is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /reply all/i }))
    fireEvent.click(screen.getByRole("button", { name: /reply all/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })

  it("triggers startComposing when Forward is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /forward/i }))
    fireEvent.click(screen.getByRole("button", { name: /forward/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })
})
