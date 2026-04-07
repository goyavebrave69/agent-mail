import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { InboxShell } from "./inbox-shell"

const { mockCreateCustomCategoryAction } = vi.hoisted(() => ({
  mockCreateCustomCategoryAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: (cb?: (status: string) => void) => {
          cb?.("SUBSCRIBED")
          return {}
        },
      }),
    }),
    removeChannel: vi.fn(),
  }),
}))

vi.mock("@/app/(app)/inbox/[emailId]/actions", () => ({
  fetchDraftForEmail: vi.fn().mockResolvedValue(null),
  createDraftOnDemand: vi.fn(),
  validateAndSendDraft: vi.fn(),
  rejectDraft: vi.fn(),
  sendManualReply: vi.fn(),
}))

vi.mock("@/app/(app)/inbox/actions", () => ({
  createCustomCategoryAction: mockCreateCustomCategoryAction,
}))

vi.mock("@/components/draft/draft-section", () => ({
  DraftSection: () => <div data-testid="draft-section" />,
}))

vi.mock("@/stores/draft-store", () => ({
  useDraftStore: vi.fn((selector: (s: { reset: () => void }) => unknown) =>
    selector({ reset: vi.fn() })
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  mockCreateCustomCategoryAction.mockReset()
})

const defaultProps = {
  emails: [],
  userId: "user-1",
  activeCategory: null as null,
  customCategories: [],
}

// ─── AC1: Collapse / expand ───────────────────────────────────────────────────

describe("InboxShell sidebar — collapse/expand", () => {
  it("renders in expanded state by default", () => {
    render(<InboxShell {...defaultProps} />)
    const sidebar = screen.getByTestId("nav-sidebar")
    expect(sidebar).toHaveAttribute("data-collapsed", "false")
  })

  it("collapses when toggle button is clicked", () => {
    render(<InboxShell {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))
    const sidebar = screen.getByTestId("nav-sidebar")
    expect(sidebar).toHaveAttribute("data-collapsed", "true")
  })

  it("expands again when toggle is clicked a second time", () => {
    render(<InboxShell {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))
    fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }))
    const sidebar = screen.getByTestId("nav-sidebar")
    expect(sidebar).toHaveAttribute("data-collapsed", "false")
  })

  it("hides nav labels when collapsed", () => {
    render(<InboxShell {...defaultProps} />)
    // Expanded: unique labels visible
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    // Collapse
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))
    // Drafts label not rendered when collapsed
    expect(screen.queryByText("Drafts")).not.toBeInTheDocument()
  })

  it("shows nav labels when expanded", () => {
    render(<InboxShell {...defaultProps} />)
    // "Inbox" appears twice (sidebar + email list panel header), use getAllByText
    expect(screen.getAllByText("Inbox").length).toBeGreaterThan(0)
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("Sent")).toBeInTheDocument()
    expect(screen.getByText("Trash")).toBeInTheDocument()
  })
})

// ─── AC2: Navigation groups and separator ────────────────────────────────────

describe("InboxShell sidebar — navigation groups", () => {
  it("renders primary nav items: Inbox, Drafts, Sent, Trash", () => {
    render(<InboxShell {...defaultProps} />)
    // "Inbox" appears in sidebar + email list header; use getAllByText
    expect(screen.getAllByText("Inbox").length).toBeGreaterThan(0)
    expect(screen.getByText("Drafts")).toBeInTheDocument()
    expect(screen.getByText("Sent")).toBeInTheDocument()
    expect(screen.getByText("Trash")).toBeInTheDocument()
  })

  it("renders a visible separator between primary and secondary navigation", () => {
    render(<InboxShell {...defaultProps} />)
    expect(screen.getByTestId("nav-separator")).toBeInTheDocument()
  })

  it("renders secondary nav category items below the separator", () => {
    render(<InboxShell {...defaultProps} />)
    // Category labels appear in secondary section
    expect(screen.getByText("Quote")).toBeInTheDocument()
    expect(screen.getByText("Inquiry")).toBeInTheDocument()
    expect(screen.getByText("Invoice")).toBeInTheDocument()
  })

  it("renders custom categories alongside system categories", () => {
    render(
      <InboxShell
        {...defaultProps}
        customCategories={[{ id: "cat-1", name: "VIP Clients", slug: "vip_clients" }]}
      />
    )

    expect(screen.getByText("Quote")).toBeInTheDocument()
    expect(screen.getByText("VIP Clients")).toBeInTheDocument()
  })
})

// ─── AC3: Session persistence ─────────────────────────────────────────────────

describe("InboxShell sidebar — session persistence", () => {
  it("reads initial collapsed state from sessionStorage", () => {
    sessionStorage.setItem("inbox_sidebar_collapsed", "true")
    render(<InboxShell {...defaultProps} />)
    const sidebar = screen.getByTestId("nav-sidebar")
    expect(sidebar).toHaveAttribute("data-collapsed", "true")
  })

  it("persists collapsed state to sessionStorage on toggle", () => {
    render(<InboxShell {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }))
    expect(sessionStorage.getItem("inbox_sidebar_collapsed")).toBe("true")
  })

  it("persists expanded state to sessionStorage on re-expand", () => {
    sessionStorage.setItem("inbox_sidebar_collapsed", "true")
    render(<InboxShell {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }))
    expect(sessionStorage.getItem("inbox_sidebar_collapsed")).toBe("false")
  })
})

describe("InboxShell manage categories modal", () => {
  it("opens modal when Manage Categories is clicked", () => {
    render(<InboxShell {...defaultProps} />)

    fireEvent.click(screen.getByTestId("manage-categories-button"))

    expect(screen.getByTestId("manage-categories-dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Manage Categories" })).toBeInTheDocument()
  })

  it("shows inline validation for empty category name", () => {
    render(<InboxShell {...defaultProps} />)

    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.click(screen.getByRole("button", { name: /create category/i }))

    expect(screen.getByTestId("custom-category-error")).toHaveTextContent(
      "Category name is required."
    )
    expect(mockCreateCustomCategoryAction).not.toHaveBeenCalled()
  })

  it("blocks duplicate custom category names", () => {
    render(
      <InboxShell
        {...defaultProps}
        customCategories={[{ id: "cat-1", name: "VIP Clients", slug: "vip_clients" }]}
      />
    )

    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.change(screen.getByTestId("custom-category-input"), {
      target: { value: "VIP Clients" },
    })
    fireEvent.click(screen.getByRole("button", { name: /create category/i }))

    expect(screen.getByTestId("custom-category-error")).toHaveTextContent("Category already exists.")
    expect(mockCreateCustomCategoryAction).not.toHaveBeenCalled()
  })

  it("creates category and renders it in sidebar", async () => {
    mockCreateCustomCategoryAction.mockResolvedValue({
      success: true,
      category: {
        id: "cat-2",
        name: "Priority Clients",
        slug: "priority_clients",
      },
    })

    render(<InboxShell {...defaultProps} />)

    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.change(screen.getByTestId("custom-category-input"), {
      target: { value: "Priority Clients" },
    })
    fireEvent.click(screen.getByRole("button", { name: /create category/i }))

    await waitFor(() => {
      expect(mockCreateCustomCategoryAction).toHaveBeenCalledWith("Priority Clients")
    })

    expect(screen.getByText("Priority Clients")).toBeInTheDocument()
  })
})
