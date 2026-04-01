import type { DraftStatus } from '@/types/draft'
import { create } from 'zustand'

interface DraftStore {
  // Current draft being viewed/edited
  activeDraftId: string | null
  draftContent: string
  status: DraftStatus
  isEditing: boolean
  editedContent: string | null
  hasUnsavedChanges: boolean

  // UI state
  isGenerating: boolean
  generationError: string | null
  isSending: boolean
  sendError: string | null

  // Actions
  setActiveDraft: (draftId: string | null, content: string, status: DraftStatus) => void
  startEditing: () => void
  updateEditedContent: (content: string) => void
  saveEdit: () => void
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
  status: 'pending' as DraftStatus,
  isEditing: false,
  editedContent: null,
  hasUnsavedChanges: false,
  isGenerating: false,
  generationError: null,
  isSending: false,
  sendError: null,
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  setActiveDraft: (draftId, content, status) =>
    set({
      activeDraftId: draftId,
      draftContent: content,
      status,
      isEditing: false,
      editedContent: null,
      hasUnsavedChanges: false,
    }),

  startEditing: () =>
    set({ isEditing: true, editedContent: get().draftContent, hasUnsavedChanges: false }),

  updateEditedContent: (content) =>
    set({ editedContent: content, hasUnsavedChanges: content !== get().draftContent }),

  saveEdit: () =>
    set((state) => ({
      draftContent: state.editedContent ?? state.draftContent,
      isEditing: false,
      hasUnsavedChanges: false,
    })),

  cancelEditing: () =>
    set((state) => ({
      isEditing: false,
      editedContent: state.draftContent,
      hasUnsavedChanges: false,
    })),

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
