import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ShortcutOverlay } from "./shortcut-overlay"

describe("ShortcutOverlay", () => {
  it("renders all 6 shortcuts when open", () => {
    render(<ShortcutOverlay open={true} onClose={vi.fn()} />)
    expect(screen.getByText("Archiver")).toBeInTheDocument()
    expect(screen.getByText("Supprimer")).toBeInTheDocument()
    expect(screen.getByText("Marquer non lu")).toBeInTheDocument()
    expect(screen.getByText(/Étoiler/)).toBeInTheDocument()
    expect(screen.getByText("Nouveau message")).toBeInTheDocument()
    expect(screen.getByText("Afficher les raccourcis")).toBeInTheDocument()
  })

  it("shows the dialog title", () => {
    render(<ShortcutOverlay open={true} onClose={vi.fn()} />)
    expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument()
  })

  it("renders nothing when closed", () => {
    render(<ShortcutOverlay open={false} onClose={vi.fn()} />)
    expect(screen.queryByText("Raccourcis clavier")).not.toBeInTheDocument()
  })

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn()
    render(<ShortcutOverlay open={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })

  it("displays shortcut keys as kbd elements", () => {
    render(<ShortcutOverlay open={true} onClose={vi.fn()} />)
    // Dialog renders in a portal; query from document.body
    expect(document.body.querySelectorAll("kbd").length).toBeGreaterThanOrEqual(6)
  })
})
