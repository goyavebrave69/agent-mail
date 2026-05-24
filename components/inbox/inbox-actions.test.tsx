import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { InboxShell } from "./inbox-shell"
import type { InboxEmail } from "@/app/(app)/inbox/page"

const { mockArchiveEmail, mockTrashEmail, mockStartComposing, mockRefresh, mockToastSuccess } = vi.hoisted(() => ({
  mockArchiveEmail: vi.fn(),
  mockTrashEmail: vi.fn(),
  mockStartComposing: vi.fn(),
  mockRefresh: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

// Mock sonner: immediately invoke onAutoClose so router.refresh is called synchronously
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string, opts?: { action?: unknown; onAutoClose?: () => void; onDismiss?: () => void }) => {
      mockToastSuccess(msg)
      opts?.onAutoClose?.()
    },
    error: vi.fn(),
  },
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
  markEmailAsRead: vi.fn().mockResolvedValue(undefined),
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
  is_starred: false,
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
    mockArchiveEmail.mockResolvedValue({ success: false, error: "Échec de l'archivage. Veuillez réessayer." })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /archive/i }))
    fireEvent.click(screen.getByRole("button", { name: /archive/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Échec de l'archivage. Veuillez réessayer.")).toBeInTheDocument()
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

    await waitFor(() => screen.getByRole("button", { name: /supprimer/i }))
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }))

    await waitFor(() => {
      expect(mockTrashEmail).toHaveBeenCalledWith("email-1")
    })
  })

  it("calls router.refresh after successful trash", async () => {
    mockTrashEmail.mockResolvedValue({ success: true })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /supprimer/i }))
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("shows error message when trash fails", async () => {
    mockTrashEmail.mockResolvedValue({ success: false, error: "Échec de la suppression. Veuillez réessayer." })
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /supprimer/i }))
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Échec de la suppression. Veuillez réessayer.")).toBeInTheDocument()
    })
  })
})

// ─── Reply / compose ──────────────────────────────────────────────────────────

describe("InboxShell — Reply action", () => {
  it("triggers startComposing when Reply is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /^répondre$/i }))
    fireEvent.click(screen.getByRole("button", { name: /^répondre$/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })

  it("triggers startComposing when Reply All is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /répondre à tous/i }))
    fireEvent.click(screen.getByRole("button", { name: /répondre à tous/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })

  it("triggers startComposing when Forward is clicked", async () => {
    render(<InboxShell {...defaultProps} />)

    await waitFor(() => screen.getByRole("button", { name: /transférer/i }))
    fireEvent.click(screen.getByRole("button", { name: /transférer/i }))

    expect(mockStartComposing).toHaveBeenCalled()
  })
})
