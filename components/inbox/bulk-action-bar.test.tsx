import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { BulkActionBar } from "./bulk-action-bar"

describe("BulkActionBar", () => {
  it("renders nothing when selectedCount is 0", () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onDeselect={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders count and action buttons when emails are selected", () => {
    render(
      <BulkActionBar
        selectedCount={3}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onDeselect={vi.fn()}
      />
    )
    expect(screen.getByText("3 sélectionnés")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /archiver la sélection/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /supprimer la sélection/i })).toBeInTheDocument()
    expect(screen.getByText("Tout désélectionner")).toBeInTheDocument()
  })

  it("calls onArchive when Archive button is clicked", () => {
    const onArchive = vi.fn()
    render(
      <BulkActionBar
        selectedCount={2}
        onArchive={onArchive}
        onTrash={vi.fn()}
        onDeselect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /archiver la sélection/i }))
    expect(onArchive).toHaveBeenCalledTimes(1)
  })

  it("calls onTrash when Supprimer button is clicked", () => {
    const onTrash = vi.fn()
    render(
      <BulkActionBar
        selectedCount={1}
        onArchive={vi.fn()}
        onTrash={onTrash}
        onDeselect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /supprimer la sélection/i }))
    expect(onTrash).toHaveBeenCalledTimes(1)
  })

  it("calls onDeselect when Tout désélectionner is clicked", () => {
    const onDeselect = vi.fn()
    render(
      <BulkActionBar
        selectedCount={2}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onDeselect={onDeselect}
      />
    )
    fireEvent.click(screen.getByText("Tout désélectionner"))
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it("disables buttons when isProcessing is true", () => {
    render(
      <BulkActionBar
        selectedCount={2}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onDeselect={vi.fn()}
        isProcessing={true}
      />
    )
    expect(screen.getByRole("button", { name: /archiver la sélection/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /supprimer la sélection/i })).toBeDisabled()
  })

  it("uses singular form for 1 selected email", () => {
    render(
      <BulkActionBar
        selectedCount={1}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onDeselect={vi.fn()}
      />
    )
    expect(screen.getByText("1 sélectionné")).toBeInTheDocument()
  })
})
