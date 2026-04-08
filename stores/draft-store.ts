import { create } from 'zustand'

export type ComposeMode = 'reply' | 'replyAll' | 'forward'

export interface ComposePrefill {
  to: string
  subject: string
  quotedBody: string
}

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
  composeMode: ComposeMode | null
  composeTo: string
  composeSubject: string
  composeQuotedBody: string
  manualContent: string
  isSendingManual: boolean
  sendManualError: string | null

  // Create on demand state
  isCreating: boolean
  createError: string | null

  // Actions
  setActiveDraft: (draftId: string | null, content: string) => void
  startEditing: () => void
  updateEditedContent: (content: string) => void
  cancelEditing: () => void
  setGenerating: (isGenerating: boolean) => void
  setError: (error: string | null) => void
  optimisticReject: () => void
  confirmReject: () => void
  startComposing: (mode: ComposeMode, prefill: ComposePrefill) => void
  updateComposeTo: (to: string) => void
  updateComposeSubject: (subject: string) => void
  updateManualContent: (content: string) => void
  cancelComposing: () => void
  optimisticSendManual: () => void
  confirmSendManual: () => void
  failSendManual: (error: string) => void
  startCreating: () => void
  failCreating: (error: string) => void
  clearCreating: () => void
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
  composeMode: null,
  composeTo: '',
  composeSubject: '',
  composeQuotedBody: '',
  manualContent: '',
  isSendingManual: false,
  sendManualError: null,
  isCreating: false,
  createError: null,
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

  startComposing: (mode, prefill) =>
    set({
      isComposing: true,
      composeMode: mode,
      composeTo: prefill.to,
      composeSubject: prefill.subject,
      composeQuotedBody: prefill.quotedBody,
      manualContent: '',
    }),

  updateComposeTo: (to) =>
    set({ composeTo: to }),

  updateComposeSubject: (subject) =>
    set({ composeSubject: subject }),

  updateManualContent: (content) =>
    set({ manualContent: content }),

  cancelComposing: () =>
    set({ isComposing: false, composeMode: null, composeTo: '', composeSubject: '', composeQuotedBody: '', manualContent: '' }),

  optimisticSendManual: () =>
    set({ isSendingManual: true, sendManualError: null }),

  confirmSendManual: () =>
    set({ ...initialState }),

  failSendManual: (error) =>
    set({ isSendingManual: false, sendManualError: error }),

  startCreating: () =>
    set({ isCreating: true, createError: null }),

  failCreating: (error) =>
    set({ isCreating: false, createError: error }),

  clearCreating: () =>
    set({ isCreating: false, createError: null }),

  reset: () =>
    set(initialState),
}))
