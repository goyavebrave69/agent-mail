import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { InboxFilters } from "./inbox-filters"

const mockPush = vi.fn()
const mockSearchParams = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams(),
}))

describe("InboxFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.mockReturnValue(new URLSearchParams())
  })

  it("renders all category filters and All button", () => {
    render(<InboxFilters activeCategory={null} />)

    expect(screen.getAllByRole("button")).toHaveLength(7)
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quote" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inquiry" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Invoice" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Follow-up" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Spam" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument()
  })

  it("highlights active category button", () => {
    render(<InboxFilters activeCategory="quote" />)

    expect(screen.getByRole("button", { name: "Quote" })).toHaveClass("ring-2")
    expect(screen.getByRole("button", { name: "All" })).not.toHaveClass("bg-primary")
  })

  it("updates URL searchParam when selecting a category", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("view=compact"))
    render(<InboxFilters activeCategory={null} />)

    fireEvent.click(screen.getByRole("button", { name: "Quote" }))

    expect(mockPush).toHaveBeenCalledWith("/inbox?view=compact&category=quote")
  })

  it("removes category searchParam when clicking active category", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("category=quote&view=compact"))
    render(<InboxFilters activeCategory="quote" />)

    fireEvent.click(screen.getByRole("button", { name: "Quote" }))

    expect(mockPush).toHaveBeenCalledWith("/inbox?view=compact")
  })

  it("removes category searchParam when clicking All", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("category=invoice"))
    render(<InboxFilters activeCategory="invoice" />)

    fireEvent.click(screen.getByRole("button", { name: "All" }))

    expect(mockPush).toHaveBeenCalledWith("/inbox")
  })
})
