import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { InboxList } from "./inbox-list"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: (callback?: (status: string) => void) => {
          callback?.("SUBSCRIBED")
          return { unsubscribe: vi.fn() }
        },
      }),
    }),
    removeChannel: vi.fn(),
  }),
}))

describe("InboxList empty states", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows default empty state when there is no active category", () => {
    render(<InboxList emails={[]} userId="user-1" activeCategory={null} />)

    expect(
      screen.getByText("Aucun email. Connectez une boîte mail dans les Paramètres pour démarrer la synchronisation.")
    ).toBeInTheDocument()
  })

  it("shows filter-specific empty state when active category has no emails", () => {
    render(<InboxList emails={[]} userId="user-1" activeCategory="quote" />)

    expect(
      screen.getByText((content) => content.includes("Aucun email") && content.includes("devis") && content.includes("filtre"))
    ).toBeInTheDocument()
  })
})
