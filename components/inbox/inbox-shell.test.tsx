"use client"
import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { InboxShell } from "./inbox-shell"
import type { InboxEmail } from "@/app/(app)/inbox/page"

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

vi.mock("@/components/draft/draft-section", () => ({
  DraftSection: () => <div data-testid="draft-section" />,
}))

vi.mock("@/stores/draft-store", () => ({
  useDraftStore: vi.fn((selector: (s: { reset: () => void }) => unknown) =>
    selector({ reset: vi.fn() })
  ),
}))

const baseEmail: InboxEmail = {
  id: "email-1",
  subject: "Hello World",
  from_email: "alice@example.com",
  from_name: "Alice Smith",
  received_at: new Date().toISOString(),
  is_read: false,
  is_archived: false,
  category: "inquiry",
  priority_rank: 1,
  body_text: "This is the body preview text",
}

function makeEmail(overrides: Partial<InboxEmail>): InboxEmail {
  return { ...baseEmail, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Filtering ────────────────────────────────────────────────────────────────

describe("InboxShell — search filtering", () => {
  it("shows all emails when search is empty", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "First" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Second" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    await waitFor(() => {
      // Both names appear in the list; Alice also appears in the reading pane (auto-selected)
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0)
    })
  })

  it("filters by sender name (case-insensitive)", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice Smith", from_email: "a@a.com", subject: "Subject A" }),
      makeEmail({ id: "e2", from_name: "Bob Jones", from_email: "b@b.com", subject: "Subject B" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "alice" },
    })

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument()
    })
  })

  it("filters by sender email even when from_name is set", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice Smith", from_email: "alice@corp.com", subject: "A" }),
      makeEmail({ id: "e2", from_name: "Bob Jones", from_email: "bob@corp.com", subject: "B" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "alice@corp.com" },
    })

    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
      expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument()
    })
  })

  it("filters by subject", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "Invoice #123" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Hello there" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "invoice" },
    })

    await waitFor(() => {
      expect(screen.getAllByText("Invoice #123").length).toBeGreaterThan(0)
      expect(screen.queryByText("Hello there")).not.toBeInTheDocument()
    })
  })

  it("filters by body preview text", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "A", body_text: "please send a quote" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "B", body_text: "see you tomorrow" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "quote" },
    })

    await waitFor(() => {
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
      expect(screen.queryByText("Bob")).not.toBeInTheDocument()
    })
  })

  it("shows empty-state message when no emails match", async () => {
    const emails = [makeEmail({ id: "e1", from_name: "Alice", subject: "Hello" })]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "zzznomatch" },
    })

    await waitFor(() => {
      expect(screen.getByText("No emails match this view.")).toBeInTheDocument()
    })
  })

  it("does not crash the reading pane when no emails match", async () => {
    const emails = [makeEmail({ id: "e1", from_name: "Alice", subject: "Hello" })]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "zzznomatch" },
    })

    await waitFor(() => {
      expect(screen.queryByTestId("draft-section")).not.toBeInTheDocument()
    })
  })

  it("restores all emails when search is cleared", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", from_email: "a@a.com", subject: "First" }),
      makeEmail({ id: "e2", from_name: "Bob", from_email: "b@b.com", subject: "Second" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    const input = screen.getByPlaceholderText("Type to search...")
    fireEvent.change(input, { target: { value: "alice" } })

    await waitFor(() => {
      expect(screen.queryByText("Bob")).not.toBeInTheDocument()
    })

    fireEvent.change(input, { target: { value: "" } })

    await waitFor(() => {
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0)
    })
  })

  it("trims whitespace from search query", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "First" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Second" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    // Only whitespace → no filter applied
    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "   " },
    })

    await waitFor(() => {
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0)
    })
  })
})

// ─── Selection behavior ───────────────────────────────────────────────────────

describe("InboxShell — selection behavior during filtering", () => {
  it("auto-selects the first email on initial render", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "First" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Second" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    await waitFor(() => {
      const firstButton = screen.getByRole("button", { name: /Alice/i })
      expect(firstButton).toHaveClass("bg-sidebar-accent/80")
    })
  })

  it("retains selected email when it is still visible after filtering", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "Match me" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Also match" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    // Select Bob
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bob/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /Bob/i }))

    // Search matches both
    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "match" },
    })

    await waitFor(() => {
      const bobButton = screen.getByRole("button", { name: /Bob/i })
      expect(bobButton).toHaveClass("bg-sidebar-accent/80")
    })
  })

  it("auto-selects first visible when selected email is filtered out", async () => {
    const emails = [
      makeEmail({ id: "e1", from_name: "Alice", subject: "Hello" }),
      makeEmail({ id: "e2", from_name: "Bob", subject: "Unique subject xyz" }),
    ]
    render(<InboxShell emails={emails} userId="user-1" activeCategory={null} />)

    // Select Bob
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bob/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /Bob/i }))

    // Filter to only Alice
    fireEvent.change(screen.getByPlaceholderText("Type to search..."), {
      target: { value: "hello" },
    })

    await waitFor(() => {
      expect(screen.queryByText("Bob")).not.toBeInTheDocument()
      const aliceButton = screen.getByRole("button", { name: /Alice/i })
      expect(aliceButton).toHaveClass("bg-sidebar-accent/80")
    })
  })
})
