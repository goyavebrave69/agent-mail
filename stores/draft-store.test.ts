import { describe, it, expect, beforeEach } from 'vitest'
import { useDraftStore } from './draft-store'

describe('useDraftStore', () => {
  beforeEach(() => {
    useDraftStore.getState().reset()
  })

  it('setActiveDraft updates store with correct draft ID and content', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Hello world', 'ready')
    const state = useDraftStore.getState()
    expect(state.activeDraftId).toBe('draft-1')
    expect(state.draftContent).toBe('Hello world')
    expect(state.status).toBe('ready')
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBeNull()
  })

  it('startEditing toggles editing mode and preserves original content', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original content', 'ready')
    useDraftStore.getState().startEditing()
    const state = useDraftStore.getState()
    expect(state.isEditing).toBe(true)
    expect(state.editedContent).toBe('Original content')
    expect(state.draftContent).toBe('Original content')
    expect(state.hasUnsavedChanges).toBe(false)
  })

  it('updateEditedContent updates text and tracks unsaved changes', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original', 'ready')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().updateEditedContent('Modified')
    const state = useDraftStore.getState()
    expect(state.editedContent).toBe('Modified')
    expect(state.draftContent).toBe('Original')
    expect(state.hasUnsavedChanges).toBe(true)
  })

  it('saveEdit persists edited content as the current draft content', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original', 'ready')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().updateEditedContent('Modified')
    useDraftStore.getState().saveEdit()
    const state = useDraftStore.getState()
    expect(state.draftContent).toBe('Modified')
    expect(state.isEditing).toBe(false)
    expect(state.hasUnsavedChanges).toBe(false)
  })

  it('cancelEditing restores original content and exits editing mode', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Original', 'ready')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().updateEditedContent('Modified')
    useDraftStore.getState().cancelEditing()
    const state = useDraftStore.getState()
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBe('Original')
    expect(state.draftContent).toBe('Original')
    expect(state.hasUnsavedChanges).toBe(false)
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

  it('reset clears all state to initial values', () => {
    useDraftStore.getState().setActiveDraft('draft-1', 'Content', 'ready')
    useDraftStore.getState().startEditing()
    useDraftStore.getState().setGenerating(true)
    useDraftStore.getState().setError('error')
    useDraftStore.getState().reset()
    const state = useDraftStore.getState()
    expect(state.activeDraftId).toBeNull()
    expect(state.draftContent).toBe('')
    expect(state.status).toBe('pending')
    expect(state.isEditing).toBe(false)
    expect(state.editedContent).toBeNull()
    expect(state.hasUnsavedChanges).toBe(false)
    expect(state.isGenerating).toBe(false)
    expect(state.generationError).toBeNull()
  })
})
