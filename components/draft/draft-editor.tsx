'use client'

import { useEffect, useRef } from 'react'
import { DraftActions } from './draft-actions'
import { ConfidenceBadge } from './confidence-badge'
import { useDraftStore } from '@/stores/draft-store'
import type { DraftStatus } from '@/types/draft'

export interface DraftEditorProps {
  draftId: string
  initialContent: string
  status: DraftStatus
  confidenceScore: number | null
  errorMessage: string | null
  onValidateAndSend: (content?: string) => void
  onSaveEdit: (content: string) => Promise<void>
  onRegenerate: (instruction: string | null) => Promise<void>
  onReject: () => void
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Generating draft" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span>Generating draft…</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function DraftEditor({
  draftId,
  initialContent,
  status,
  confidenceScore,
  errorMessage,
  onValidateAndSend,
  onSaveEdit,
  onRegenerate,
  onReject,
}: DraftEditorProps) {
  const {
    draftContent,
    isEditing,
    isSending,
    isRegenerating,
    sendError,
    regenerateError,
    showRegenerateModal,
    hasUnsavedChanges,
    editedContent,
    setActiveDraft,
    startEditing,
    updateEditedContent,
    saveEdit,
    cancelEditing,
    openRegenerateModal,
    closeRegenerateModal,
  } = useDraftStore()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setActiveDraft(draftId, initialContent, status)
  }, [draftId, initialContent, setActiveDraft, status])

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
    }
  }, [isEditing])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return

    event.preventDefault()
    const target = event.currentTarget
    const start = target.selectionStart
    const end = target.selectionEnd
    const currentValue = editedContent ?? draftContent
    const nextValue = `${currentValue.slice(0, start)}  ${currentValue.slice(end)}`
    updateEditedContent(nextValue)

    requestAnimationFrame(() => {
      target.selectionStart = start + 2
      target.selectionEnd = start + 2
    })
  }

  const handleSave = async () => {
    const content = editedContent ?? draftContent
    await onSaveEdit(content)
    saveEdit()
  }

  if (status === 'generating') {
    return (
      <div className="rounded-lg border p-4">
        <GeneratingSkeleton />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
        role="alert"
      >
        <p className="mb-3 text-sm font-medium text-destructive">
          {errorMessage ?? 'Draft generation failed.'}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Draft generation failed. Click retry to regenerate.
        </p>
        <button
          onClick={() => void onRegenerate(null)}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
        >
          Retry generation
        </button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={editedContent ?? draftContent}
          onChange={(e) => updateEditedContent(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          className="w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={10}
          aria-label="Edit draft content"
        />
        <DraftActions
          draftId={draftId}
          status={status}
          isEditing
          isSending={isSending}
          draftContent={draftContent}
          editedContent={editedContent}
          hasUnsavedChanges={hasUnsavedChanges}
          onValidateAndSend={onValidateAndSend}
          onEdit={startEditing}
          onSave={handleSave}
          onCancel={cancelEditing}
          isRegenerating={isRegenerating}
          showRegenerateModal={showRegenerateModal}
          onRegenerate={onRegenerate}
          onOpenRegenerateModal={openRegenerateModal}
          onCloseRegenerateModal={closeRegenerateModal}
          onReject={onReject}
        />
      </div>
    )
  }

  // Ready state
  return (
    <div className="space-y-4">
      {confidenceScore !== null && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Confidence:</span>
          <ConfidenceBadge score={confidenceScore} />
        </div>
      )}
      <div className="rounded-lg border p-4">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{initialContent}</pre>
      </div>
      {sendError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm font-medium text-destructive">Action failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{sendError}</p>
        </div>
      )}
      {regenerateError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm font-medium text-destructive">Regeneration failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{regenerateError}</p>
        </div>
      )}
      <DraftActions
        draftId={draftId}
        status={status}
        draftContent={draftContent}
        isSending={isSending}
        isRegenerating={isRegenerating}
        showRegenerateModal={showRegenerateModal}
        onValidateAndSend={onValidateAndSend}
        onEdit={startEditing}
        onSave={handleSave}
        onCancel={cancelEditing}
        onRegenerate={onRegenerate}
        onOpenRegenerateModal={openRegenerateModal}
        onCloseRegenerateModal={closeRegenerateModal}
        onReject={onReject}
      />
    </div>
  )
}
