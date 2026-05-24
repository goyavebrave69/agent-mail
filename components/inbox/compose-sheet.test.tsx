import "@testing-library/jest-dom/vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ComposeSheet } from "./compose-sheet"

vi.mock("@/app/(app)/inbox/actions", () => ({
  sendNewEmail: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { sendNewEmail } from "@/app/(app)/inbox/actions"
import { toast } from "sonner"

const mockSendNewEmail = vi.mocked(sendNewEmail)
const mockToast = vi.mocked(toast)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ComposeSheet", () => {
  it("renders header, To, Subject, and Send button when open", () => {
    render(<ComposeSheet open={true} onClose={vi.fn()} />)

    expect(screen.getByText("Nouveau message")).toBeInTheDocument()
    expect(screen.getByLabelText("À")).toBeInTheDocument()
    expect(screen.getByLabelText("Objet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeInTheDocument()
  })

  it("does not render content when closed", () => {
    render(<ComposeSheet open={false} onClose={vi.fn()} />)

    expect(screen.queryByText("Nouveau message")).not.toBeInTheDocument()
  })

  it("shows validation error when To field is empty and send is clicked", async () => {
    render(<ComposeSheet open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => {
      expect(screen.getByText("Le destinataire est requis.")).toBeInTheDocument()
    })
    expect(mockSendNewEmail).not.toHaveBeenCalled()
  })

  it("shows validation error for invalid email address", async () => {
    render(<ComposeSheet open={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("À"), { target: { value: "notanemail" } })
    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => {
      expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument()
    })
    expect(mockSendNewEmail).not.toHaveBeenCalled()
  })

  it("calls onClose and shows success toast after successful send", async () => {
    mockSendNewEmail.mockResolvedValue({ success: true })
    const onClose = vi.fn()

    render(<ComposeSheet open={true} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText("À"), { target: { value: "test@example.com" } })

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement
    if (editor) {
      Object.defineProperty(editor, 'innerText', { get: () => 'Hello world', configurable: true })
      editor.innerHTML = 'Hello world'
    }

    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Email envoyé")
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("shows error toast on send failure without closing", async () => {
    mockSendNewEmail.mockResolvedValue({ success: false, error: "Erreur réseau" })
    const onClose = vi.fn()

    render(<ComposeSheet open={true} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText("À"), { target: { value: "test@example.com" } })

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement
    if (editor) {
      Object.defineProperty(editor, 'innerText', { get: () => 'Hello world', configurable: true })
      editor.innerHTML = 'Hello world'
    }

    fireEvent.click(screen.getByRole("button", { name: /envoyer/i }))

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erreur réseau")
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes without confirmation when fields are empty", () => {
    const onClose = vi.fn()
    render(<ComposeSheet open={true} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText("Fermer"))

    expect(onClose).toHaveBeenCalled()
  })

  it("reveals Cc/Bcc fields on Cc button click", () => {
    render(<ComposeSheet open={true} onClose={vi.fn()} />)

    expect(screen.queryByLabelText("Cc")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^Cc/i }))

    expect(screen.getByLabelText("Cc")).toBeInTheDocument()
    expect(screen.getByLabelText("Cci")).toBeInTheDocument()
  })
})
