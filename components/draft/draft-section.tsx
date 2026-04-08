'use client'

import { useCallback, useState } from 'react'
import { ManualCompose } from './manual-compose'
import { DraftRealtime } from './draft-realtime'
import { PdfConfirmationBlock } from './pdf-confirmation-block'
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
  responseType?: 'text_reply' | 'pdf_required' | 'unknown'
}

export function DraftSection({ emailId, userId, responseType }: DraftSectionProps) {
  const [pdfIgnored, setPdfIgnored] = useState(false)
  const {
    isComposing,
    composeMode,
    composeTo,
    composeSubject,
    composeQuotedBody,
    manualContent,
    isSendingManual,
    sendManualError,
    isCreating,
    createError,
    cancelComposing,
    updateComposeTo,
    updateComposeSubject,
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
      const result = await sendManualReply(emailId, content, {
        to: composeTo,
        subject: composeSubject,
        isForward: composeMode === 'forward',
      })
      if (result.success) {
        confirmSendManual()
      } else {
        failSendManual(result.error ?? 'Failed to send reply.')
      }
    },
    [emailId, composeTo, composeSubject, composeMode, optimisticSendManual, confirmSendManual, failSendManual]
  )

  const handleCreateDraft = useCallback(async () => {
    startCreating()
    const result = await createDraftOnDemand(emailId)
    if (!result.success) {
      failCreating(result.error ?? 'Failed to start draft generation.')
      return
    }
    // Edge function is synchronous: draft is ready in DB when the action resolves.
    // Fetch it directly rather than relying solely on Realtime.
    try {
      const draft = await fetchDraftForEmail(emailId)
      if (draft?.status === 'ready' && draft.content) {
        updateManualContent(draft.content)
      }
    } finally {
      clearCreating()
    }
  }, [emailId, startCreating, failCreating, clearCreating, updateManualContent])

  if (!isComposing) return null

  return (
    <div className="space-y-3">
      {responseType === 'pdf_required' && !pdfIgnored && (
        <PdfConfirmationBlock
          onGenerate={() => {
            // TODO: trigger PDF generation flow (Story 6.x)
          }}
          onIgnore={() => setPdfIgnored(true)}
        />
      )}
      <ManualCompose
        emailId={emailId}
        mode={composeMode}
        composeTo={composeTo}
        composeSubject={composeSubject}
        composeQuotedBody={composeQuotedBody}
        onToChange={updateComposeTo}
        onSubjectChange={updateComposeSubject}
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
