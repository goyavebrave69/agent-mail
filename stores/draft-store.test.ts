import { describe, it, expect, beforeEach } from 'vitest'
import { useDraftStore } from './draft-store'

describe('useDraftStore', () => {
  beforeEach(() => {
    useDraftStore.getState().reset()
  })

  it('setActiveDraft updates store with correct draft ID and content', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Hello world')
    const state = useDraftStore.getState()
    expect(state.activeDraftId).toBe('draft-1')
    expect(state.draftContent).toBe('Hello world')
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBeNull()
  })

  it('startEditing toggles editing mode and preserves original content', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original content')
    useDraftStore.getState().startEditing()
    const state = useDraftStore.getState()
    expect(state.isEditing).toBe(true)
    expect(state.editedContent).toBe('Original content')
    expect(state.draftContent).toBe('Original content')
  })

  it('updateEditedContent updates edited content without affecting original', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().updateEditedContent('Modified')
    const state = useDraftStore.getState()
    expect(state.editedContent).toBe('Modified')
    expect(state.draftContent).toBe('Original')
  })

  it('cancelEditing restores original content and exits editing mode', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().updateEditedContent('Modified')
    useDraftStore.getState().cancelEditing()
    const state = useDraftStore.getState()
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBeNull()
    expect(state.draftContent).toBe('Original')
  })

  it('setGenerating and setError update UI state correctly', () => {
    useDraftStore.getState().setGenerating(true)
    expect(useDraftStore.getState().isGenerating).toBe(true)

    useDraftStore.getState().setGenerating(false)
    expect(useDraftStore.getState().isGenerating).toBe(false)

    useDraftStore.getState().setError('Something went wrong')
    expect(useDraftStore.getState().generationError).toBe('Something went wrong')

    useDraftStore.getState().setError(null)
    expect(useDraftStore.getState().generationError).toBeNull()
  })

  it('optimisticReject sets isRejected to true and clears compose state', () => {
    useDraftStore.getState().optimisticReject()
    const state = useDraftStore.getState()
    expect(state.isRejected).toBe(true)
    expect(state.isComposing).toBe(false)
    expect(state.manualContent).toBe('')
  })

  it('startComposing sets isComposing to true with prefill', () => {
    useDraftStore.getState().optimisticReject()
    useDraftStore.getState().startComposing('reply', { to: 'a@b.com', subject: 'Re: Test', quotedBody: 'Original' })
    const state = useDraftStore.getState()
    expect(state.isComposing).toBe(true)
    expect(state.composeMode).toBe('reply')
    expect(state.composeTo).toBe('a@b.com')
    expect(state.composeSubject).toBe('Re: Test')
    expect(state.composeQuotedBody).toBe('Original')
    expect(state.manualContent).toBe('')
  })

  it('updateManualContent updates manualContent', () => {
    useDraftStore.getState().startComposing('reply', { to: 'a@b.com', subject: 'Re: Test', quotedBody: '' })
    useDraftStore.getState().updateManualContent('My reply')
    expect(useDraftStore.getState().manualContent).toBe('My reply')
  })

  it('cancelComposing returns to rejected state without composing', () => {
    useDraftStore.getState().optimisticReject()
    useDraftStore.getState().startComposing('reply', { to: 'a@b.com', subject: 'Re: Test', quotedBody: '' })
    useDraftStore.getState().updateManualContent('draft text')
    useDraftStore.getState().cancelComposing()
    const state = useDraftStore.getState()
    expect(state.isComposing).toBe(false)
    expect(state.isRejected).toBe(true)
    expect(state.manualContent).toBe('')
  })

  it('startCreating sets isCreating to true and clears createError', () => {
    useDraftStore.getState().failCreating('oops')
    useDraftStore.getState().startCreating()
    const state = useDraftStore.getState()
    expect(state.isCreating).toBe(true)
    expect(state.createError).toBeNull()
  })

  it('failCreating sets isCreating to false and stores the error', () => {
    useDraftStore.getState().startCreating()
    useDraftStore.getState().failCreating('invoke error')
    const state = useDraftStore.getState()
    expect(state.isCreating).toBe(false)
    expect(state.createError).toBe('invoke error')
  })

  it('clearCreating resets isCreating and createError', () => {
    useDraftStore.getState().startCreating()
    useDraftStore.getState().clearCreating()
    const state = useDraftStore.getState()
    expect(state.isCreating).toBe(false)
    expect(state.createError).toBeNull()
  })

  it('reset clears all state to initial values', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Content')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().setGenerating(true)
    useDraftStore.getState().setError('error')
    useDraftStore.getState().startCreating()
    useDraftStore.getState().reset()
    const state = useDraftStore.getState()
    expect(state.activeDraftId).toBeNull()
    expect(state.draftContent).toBe('')
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBeNull()
    expect(state.isGenerating).toBe(false)
    expect(state.generationError).toBeNull()
    expect(state.isRejected).toBe(false)
    expect(state.isComposing).toBe(false)
    expect(state.manualContent).toBe('')
    expect(state.isCreating).toBe(false)
    expect(state.createError).toBeNull()
  })
})
