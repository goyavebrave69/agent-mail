'use client'

import { useEffect } from 'react'
import { ConfidenceBadge } from './confidence-badge'
import { DraftActions } from './draft-actions'
import { useDraftStore } from '@/stores/draft-store'
import type { DraftStatus } from '@/types/draft'

export interface DraftEditorProps {
  draftId: string
  initialContent: string
  status: DraftStatus
  confidenceScore: number | null
  errorMessage: string | null
  onValidateAndSend: () => void
  onRegenerate: () => void
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
  onRegenerate,
  onReject,
}: DraftEditorProps) {
  const {
    isEditing,
    isSending,
    sendError,
    editedContent,
    setActiveDraft,
    startEditing,
    updateEditedContent,
    cancelEditing,
  } = useDraftStore()

  useEffect(() => {
    setActiveDraft(draftId, initialContent)
  }, [draftId, initialContent, setActiveDraft])

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
          onClick={onRegenerate}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
        >
          Retry generation
        </button>
      </div>
    )
  }

  if (isEditing) {
    const charCount = (editedContent ?? initialContent).length

    return (
      <div className="space-y-3">
        <textarea
          value={editedContent ?? initialContent}
          onChange={(e) => updateEditedContent(e.target.value)}
          className="w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={10}
          aria-label="Edit draft content"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{charCount} characters</span>
          <div className="flex gap-2">
            <button
              onClick={cancelEditing}
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={onValidateAndSend}
              disabled={isSending}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
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
          <p className="text-sm font-medium text-destructive">Failed to send</p>
          <p className="mt-1 text-sm text-muted-foreground">{sendError}</p>
        </div>
      )}
      <DraftActions
        draftId={draftId}
        status={status}
        isSending={isSending}
        onValidateAndSend={onValidateAndSend}
        onEdit={startEditing}
        onRegenerate={onRegenerate}
        onReject={onReject}
      />
    </div>
  )
}
