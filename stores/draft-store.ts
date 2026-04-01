import { create } from 'zustand'

interface DraftStore {
  // Current draft being viewed/edited
  activeDraftId: string | null
  draftContent: string
  isEditing: boolean
  editedContent: string | null

  // UI state
  isGenerating: boolean
  generationError: string | null
  isSending: boolean
  sendError: string | null

  // Actions
  setActiveDraft: (draftId: string | null, content: string) => void
  startEditing: () => void
  updateEditedContent: (content: string) => void
  cancelEditing: () => void
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
  optimisticSend: () => void
  confirmSend: () => void
  failSend: (error: string) => void
  reset: () => void
}

const initialState = {
  activeDraftId: null,
  draftContent: '',
  isEditing: false,
  editedContent: null,
  isGenerating: false,
  generationError: null,
  isSending: false,
  sendError: null,
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setActiveDraft: (draftId, content) =>
    set({ activeDraftId: draftId, draftContent: content, isEditing: false, editedContent: null }),

  startEditing: () =>
    set({ isEditing: true, editedContent: get().draftContent }),

  updateEditedContent: (content) =>
    set({ editedContent: content }),

  cancelEditing: () =>
    set({ isEditing: false, editedContent: null }),

  setGenerating: (isGenerating) =>
    set({ isGenerating }),

  setError: (error) =>
    set({ generationError: error }),

  optimisticSend: () =>
    set({ isSending: true, sendError: null }),

  confirmSend: () =>
    set({ ...initialState }),

  failSend: (error) =>
    set({ isSending: false, sendError: error }),

  reset: () =>
    set(initialState),
}))
