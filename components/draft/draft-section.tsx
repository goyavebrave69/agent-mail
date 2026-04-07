'use client'

import { useCallback } from 'react'
import { ManualCompose } from './manual-compose'
import { DraftRealtime } from './draft-realtime'
import { useDraftStore } from '@/stores/draft-store'
import {
  sendManualReply,
  createDraftOnDemand,
  fetchDraftForEmail,
} from '@/app/(app)/inbox/[emailId]/actions'
import type { Draft } from '@/types/draft'

interface DraftSectionProps {
  emailId: string
  userId: string
}

export function DraftSection({ emailId, userId }: DraftSectionProps) {
  const {
    isComposing,
    manualContent,
    isSendingManual,
    sendManualError,
    isCreating,
    createError,
    cancelComposing,
    updateManualContent,
    optimisticSendManual,
    confirmSendManual,
    failSendManual,
    startCreating,
    failCreating,
    clearCreating,
  } = useDraftStore()

  const handleDraftUpdate = useCallback(
    (updated: Draft) => {
      if (updated.email_id !== emailId) return

      if (updated.status === 'ready' || updated.status === 'error') {
        clearCreating()
      }
      if (updated.status === 'ready' && updated.content && isComposing) {
        updateManualContent(updated.content)
      }
    },
    [clearCreating, emailId, isComposing, updateManualContent]
  )

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
    if (isCreating) return

    startCreating()
    try {
      const result = await createDraftOnDemand(emailId)
      if (!result.success) {
        failCreating(result.error ?? 'Failed to start draft generation.')
        return
      }

      try {
        const draft = await fetchDraftForEmail(emailId)
        if (draft?.status === 'ready' && draft.content) {
          updateManualContent(draft.content)
        }
      } finally {
        clearCreating()
      }
    } catch {
      failCreating('Failed to start draft generation.')
    }
  }, [emailId, isCreating, startCreating, failCreating, clearCreating, updateManualContent])

  if (!isComposing) return null

  return (
    <div className="space-y-3">
      <ManualCompose
        emailId={emailId}
        onSend={handleSendManual}
        onCancel={cancelComposing}
        isSending={isSendingManual}
        sendError={sendManualError}
        manualContent={manualContent}
        onContentChange={updateManualContent}
        onCreateDraft={handleCreateDraft}
        isCreating={isCreating}
      />
      {createError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
        >
          <p className="text-sm font-medium text-destructive">{createError}</p>
        </div>
      )}
      <DraftRealtime draftId={null} userId={userId} onDraftUpdate={handleDraftUpdate} />
    </div>
  )
}
