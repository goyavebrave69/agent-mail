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
  isRegenerating: boolean
  regenerateError: string | null
  showRegenerateModal: boolean

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
  openRegenerateModal: () => void
  closeRegenerateModal: () => void
  optimisticRegenerate: () => void
  confirmRegenerate: () => void
  failRegenerate: (error: string) => void
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
  isRegenerating: false,
  regenerateError: null,
  showRegenerateModal: false,
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

  openRegenerateModal: () =>
    set({ showRegenerateModal: true, regenerateError: null }),

  closeRegenerateModal: () =>
    set({ showRegenerateModal: false }),

  optimisticRegenerate: () =>
    set({
      isRegenerating: true,
      regenerateError: null,
      showRegenerateModal: false,
      status: 'generating',
      draftContent: '',
      isEditing: false,
      editedContent: null,
      hasUnsavedChanges: false,
    }),

  confirmRegenerate: () =>
    set({ isRegenerating: false, regenerateError: null }),

  failRegenerate: (error) =>
    set({ isRegenerating: false, regenerateError: error }),

  reset: () =>
    set(initialState),
}))
