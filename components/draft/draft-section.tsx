'use client'

import { useCallback, useState } from 'react'
import { DraftEditor } from './draft-editor'
import { DraftRealtime } from './draft-realtime'
import { ManualCompose } from './manual-compose'
import { useDraftStore } from '@/stores/draft-store'
import {
  validateAndSendDraft,
  rejectDraft,
  sendManualReply,
} from '@/app/(app)/inbox/[emailId]/actions'
import type { Draft } from '@/types/draft'

interface DraftSectionProps {
  draft: Draft | null
  emailId: string
  userId: string
}

export function DraftSection({ draft: initialDraft, emailId, userId }: DraftSectionProps) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft)

  const {
    isRejected,
    isComposing,
    manualContent,
    isSendingManual,
    sendManualError,
    optimisticReject,
    startComposing,
    cancelComposing,
    updateManualContent,
    optimisticSendManual,
    confirmSendManual,
    failSendManual,
  } = useDraftStore()

  const handleDraftUpdate = useCallback((updated: Draft) => {
    setDraft(updated)
  }, [])

  const handleValidateAndSend = useCallback(async () => {
    if (!draft) return
    await validateAndSendDraft(draft.id)
  }, [draft])

  const handleReject = useCallback(async () => {
    if (!draft) return
    optimisticReject()
    const result = await rejectDraft(draft.id)
    if (!result.success) {
      // Rejection failed — UI is already in rejected state optimistically; surface no further error
    }
  }, [draft, optimisticReject])

  const handleSendManual = useCallback(async (content: string) => {
    optimisticSendManual()
    const result = await sendManualReply(emailId, content)
    if (result.success) {
      confirmSendManual()
    } else {
      failSendManual(result.error ?? 'Failed to send reply.')
    }
  }, [emailId, optimisticSendManual, confirmSendManual, failSendManual])

  if (!draft && !isRejected) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No draft available yet.
      </div>
    )
  }

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

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        AI Draft
      </h2>
      <DraftEditor
        draftId={draft!.id}
        initialContent={draft!.content ?? ''}
        status={draft!.status}
        confidenceScore={draft!.confidence_score}
        errorMessage={draft!.error_message}
        onValidateAndSend={handleValidateAndSend}
        onRegenerate={() => {}}
        onReject={handleReject}
      />
      <DraftRealtime
        draftId={draft!.id}
        userId={userId}
        onDraftUpdate={handleDraftUpdate}
      />
    </div>
  )
}
