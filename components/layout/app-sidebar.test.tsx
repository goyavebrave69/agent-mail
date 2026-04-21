"use client"
import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { AppSidebar } from "./app-sidebar"

const { mockCreateCustomCategoryAction } = vi.hoisted(() => ({
  mockCreateCustomCategoryAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/inbox",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/app/(app)/inbox/actions", () => ({
  createCustomCategoryAction: mockCreateCustomCategoryAction,
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  mockCreateCustomCategoryAction.mockReset()
})

const defaultProps = {
  customCategories: [],
}

// ─── Collapse / expand ────────────────────────────────────────────────────────

describe("AppSidebar — collapse/expand", () => {
  it("renders in expanded state by default", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "false")
  })

  it("collapses when toggle button is clicked", () => {
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /réduire la barre latérale/i }))
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "true")
  })

  it("expands again when toggle is clicked a second time", () => {
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /réduire la barre latérale/i }))
    fireEvent.click(screen.getByRole("button", { name: /développer la barre latérale/i }))
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "false")
  })

  it("hides nav labels when collapsed", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByText("Base de connaissances")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /réduire la barre latérale/i }))
    expect(screen.queryByText("Base de connaissances")).not.toBeInTheDocument()
  })
})

// ─── Session persistence ──────────────────────────────────────────────────────

describe("AppSidebar — session persistence", () => {
  it("reads initial collapsed state from sessionStorage", () => {
    sessionStorage.setItem("app_sidebar_collapsed", "true")
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "true")
  })

  it("persists collapsed state to sessionStorage on toggle", () => {
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByRole("button", { name: /réduire la barre latérale/i }))
    expect(sessionStorage.getItem("app_sidebar_collapsed")).toBe("true")
  })
})

// ─── Primary navigation ───────────────────────────────────────────────────────

describe("AppSidebar — primary navigation", () => {
  it("renders Inbox, Knowledge Base and Settings links", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByRole("link", { name: /boîte de réception/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /base de connaissances/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /paramètres/i })).toBeInTheDocument()
  })

  it("Inbox link points to /inbox", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByRole("link", { name: /boîte de réception/i })).toHaveAttribute("href", "/inbox")
  })

  it("Knowledge Base link points to /knowledge-base", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByRole("link", { name: /base de connaissances/i })).toHaveAttribute(
      "href",
      "/knowledge-base"
    )
  })

  it("Settings link points to /settings", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByRole("link", { name: /paramètres/i })).toHaveAttribute("href", "/settings")
  })
})

// ─── Category section (inbox route) ──────────────────────────────────────────

describe("AppSidebar — category section on /inbox", () => {
  it("renders separator and All filter on inbox route", () => {
    render(<AppSidebar {...defaultProps} />)
    expect(screen.getByTestId("nav-separator")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^toutes$/i })).toBeInTheDocument()
  })

  it("renders custom categories in the sidebar", () => {
    render(
      <AppSidebar
        customCategories={[{ id: "cat-1", name: "VIP Clients", slug: "vip_clients" }]}
      />
    )
    expect(screen.getByText("VIP Clients")).toBeInTheDocument()
  })
})

// ─── Manage categories modal ──────────────────────────────────────────────────

describe("AppSidebar — manage categories modal", () => {
  it("opens modal when Manage Categories is clicked", () => {
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByTestId("manage-categories-button"))
    expect(screen.getByTestId("manage-categories-dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Gérer les catégories" })).toBeInTheDocument()
  })

  it("shows validation error for empty category name", () => {
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.click(screen.getByRole("button", { name: /créer la catégorie/i }))
    expect(screen.getByTestId("custom-category-error")).toHaveTextContent(
      "Le nom de la catégorie est requis."
    )
    expect(mockCreateCustomCategoryAction).not.toHaveBeenCalled()
  })

  it("blocks duplicate custom category names", () => {
    render(
      <AppSidebar
        customCategories={[{ id: "cat-1", name: "VIP Clients", slug: "vip_clients" }]}
      />
    )
    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.change(screen.getByTestId("custom-category-input"), {
      target: { value: "VIP Clients" },
    })
    fireEvent.click(screen.getByRole("button", { name: /créer la catégorie/i }))
    expect(screen.getByTestId("custom-category-error")).toHaveTextContent("Cette catégorie existe déjà.")
    expect(mockCreateCustomCategoryAction).not.toHaveBeenCalled()
  })

  it("creates category and renders it in sidebar", async () => {
    mockCreateCustomCategoryAction.mockResolvedValue({
      success: true,
      category: { id: "cat-2", name: "Priority Clients", slug: "priority_clients" },
    })
    render(<AppSidebar {...defaultProps} />)
    fireEvent.click(screen.getByTestId("manage-categories-button"))
    fireEvent.change(screen.getByTestId("custom-category-input"), {
      target: { value: "Priority Clients" },
    })
    fireEvent.click(screen.getByRole("button", { name: /créer la catégorie/i }))
    await waitFor(() => {
      expect(mockCreateCustomCategoryAction).toHaveBeenCalledWith("Priority Clients", undefined)
    })
    expect(screen.getByText("Priority Clients")).toBeInTheDocument()
  })
})
