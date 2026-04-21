import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { InboxZeroState } from "./inbox-zero-state"

describe("InboxZeroState", () => {
  it("renders the main title", () => {
    render(<InboxZeroState />)
    expect(screen.getByText("Tout est traité")).toBeInTheDocument()
  })

  it("shows default message when no processedCount is provided", () => {
    render(<InboxZeroState />)
    expect(screen.getByText("Votre boîte de réception est à jour")).toBeInTheDocument()
  })

  it("shows processed count when processedCount > 0", () => {
    render(<InboxZeroState processedCount={5} />)
    expect(screen.getByText("Vous avez traité 5 emails aujourd'hui")).toBeInTheDocument()
  })

  it("uses singular form for processedCount = 1", () => {
    render(<InboxZeroState processedCount={1} />)
    expect(screen.getByText("Vous avez traité 1 email aujourd'hui")).toBeInTheDocument()
  })

  it("shows default message when processedCount is 0", () => {
    render(<InboxZeroState processedCount={0} />)
    expect(screen.getByText("Votre boîte de réception est à jour")).toBeInTheDocument()
  })
})
