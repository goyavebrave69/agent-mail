'use client'

import { useCallback, useEffect, useState } from 'react'
import { DraftEditor } from './draft-editor'
import { DraftRealtime } from './draft-realtime'
import { ManualCompose } from './manual-compose'
import { useDraftStore } from '@/stores/draft-store'
import {
  validateAndSendDraft,
  rejectDraft,
  sendManualReply,
  createDraftOnDemand,
} from '@/app/(app)/inbox/[emailId]/actions'
import type { Draft } from '@/types/draft'

interface DraftSectionProps {
  draft: Draft | null
  emailId: string
  userId: string
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

export function DraftSection({ draft: initialDraft, emailId, userId }: DraftSectionProps) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft)

  const {
    isRejected,
    isComposing,
    manualContent,
    isSendingManual,
    sendManualError,
    isCreating,
    createError,
    optimisticReject,
    startComposing,
    cancelComposing,
    updateManualContent,
    optimisticSendManual,
    confirmSendManual,
    failSendManual,
    startCreating,
    failCreating,
    clearCreating,
  } = useDraftStore()

  // Sync initialDraft prop into local state (e.g. after router.refresh or SSR update)
  useEffect(() => {
    if (initialDraft !== null) {
      setDraft(initialDraft)
      clearCreating()
    }
  }, [initialDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDraftUpdate = useCallback(
    (updated: Draft) => {
      setDraft(updated)
      if (updated.status === 'ready' || updated.status === 'error') {
        clearCreating()
      }
    },
    [clearCreating]
  )

  const handleValidateAndSend = useCallback(async () => {
    if (!draft) return
    await validateAndSendDraft(draft.id)
  }, [draft])

  const handleReject = useCallback(async () => {
    if (!draft) return
    optimisticReject()
    await rejectDraft(draft.id)
  }, [draft, optimisticReject])

  const handleSendManual = useCallback(
    async (content: string) => {
      optimisticSendManual()
      const result = await sendManualReply(emailId, content)
      if (result.success) {
        confirmSendManual()
      } else {
        failSendManual(result.error ?? 'Failed to send reply.')
      }
    },
    [emailId, optimisticSendManual, confirmSendManual, failSendManual]
  )

  const handleCreateDraft = useCallback(async () => {
    startCreating()
    const result = await createDraftOnDemand(emailId)
    if (!result.success) {
      failCreating(result.error ?? 'Failed to start draft generation.')
    }
    // On success, DraftRealtime (with draftId=null) will fire when the draft arrives
  }, [emailId, startCreating, failCreating])

  if (isRejected) {
    if (isComposing) {
      return (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Manual Reply
          </h2>
          <ManualCompose
            emailId={emailId}
            onSend={handleSendManual}
            onCancel={cancelComposing}
            isSending={isSendingManual}
            sendError={sendManualError}
            manualContent={manualContent}
            onContentChange={updateManualContent}
          />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI Draft
        </h2>
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Draft rejected.
        </div>
        <button
          onClick={startComposing}
          className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          aria-label="Write your own reply"
        >
          Write Reply
        </button>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI Draft
        </h2>

        {isCreating ? (
          <div className="rounded-lg border p-4">
            <GeneratingSkeleton />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No draft available yet.
            </div>
            {createError && (
              <div
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"
                role="alert"
              >
                <p className="text-sm font-medium text-destructive">{createError}</p>
              </div>
            )}
            <button
              onClick={handleCreateDraft}
              disabled={isCreating}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Create draft"
            >
              Create Draft
            </button>
          </>
        )}

        {/* Listen for new drafts even when none exists yet */}
        <DraftRealtime draftId={null} userId={userId} onDraftUpdate={handleDraftUpdate} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        AI Draft
      </h2>
      <DraftEditor
        draftId={draft.id}
        initialContent={draft.content ?? ''}
        status={draft.status}
        confidenceScore={draft.confidence_score}
        errorMessage={draft.error_message}
        onValidateAndSend={handleValidateAndSend}
        onRegenerate={() => {}}
        onReject={handleReject}
      />
      <DraftRealtime
        draftId={draft.id}
        userId={userId}
        onDraftUpdate={handleDraftUpdate}
      />
    </div>
  )
}
