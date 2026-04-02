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

  // Rejection / manual compose state
  isRejected: boolean
  isComposing: boolean
  manualContent: string
  isSendingManual: boolean
  sendManualError: string | null

  // Actions
  setActiveDraft: (draftId: string | null, content: string) => void
  startEditing: () => void
  updateEditedContent: (content: string) => void
  cancelEditing: () => void
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
  optimisticReject: () => void
  confirmReject: () => void
  startComposing: () => void
  updateManualContent: (content: string) => void
  cancelComposing: () => void
  optimisticSendManual: () => void
  confirmSendManual: () => void
  failSendManual: (error: string) => void
  reset: () => void
}

const initialState = {
  activeDraftId: null,
  draftContent: '',
  isEditing: false,
  editedContent: null,
  isGenerating: false,
  generationError: null,
  isRejected: false,
  isComposing: false,
  manualContent: '',
  isSendingManual: false,
  sendManualError: null,
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setActiveDraft: (draftId, content) =>
    set({
      activeDraftId: draftId,
      draftContent: content,
      isEditing: false,
      editedContent: null,
      isRejected: false,
      isComposing: false,
      manualContent: '',
    }),

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

  optimisticReject: () =>
    set({
      isRejected: true,
      isComposing: false,
      manualContent: '',
      isEditing: false,
      editedContent: null,
    }),

  confirmReject: () =>
    set({ isRejected: true }),

  startComposing: () =>
    set({ isComposing: true, manualContent: '' }),

  updateManualContent: (content) =>
    set({ manualContent: content }),

  cancelComposing: () =>
    set({ isComposing: false, manualContent: '' }),

  optimisticSendManual: () =>
    set({ isSendingManual: true, sendManualError: null }),

  confirmSendManual: () =>
    set({ ...initialState }),

  failSendManual: (error) =>
    set({ isSendingManual: false, sendManualError: error }),

  reset: () =>
    set(initialState),
}))
