'use client'

import { useCallback } from 'react'
import { ManualCompose } from './manual-compose'
import { DraftRealtime } from './draft-realtime'
import { useDraftStore } from '@/stores/draft-store'
import {
  sendManualReply,
  createDraftOnDemand,
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
      if (updated.status === 'ready' || updated.status === 'error') {
        clearCreating()
      }
      if (updated.status === 'ready' && updated.content && isComposing) {
        updateManualContent(updated.content)
      }
    },
    [clearCreating, isComposing, updateManualContent]
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
    startCreating()
    const result = await createDraftOnDemand(emailId)
    if (!result.success) {
      failCreating(result.error ?? 'Failed to start draft generation.')
    }
  }, [emailId, startCreating, failCreating])

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
