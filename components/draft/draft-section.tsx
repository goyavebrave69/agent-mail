'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ManualCompose } from './manual-compose'
import { DraftRealtime } from './draft-realtime'
import { PdfConfirmationBlock } from './pdf-confirmation-block'
import { ConfidenceBadge } from './confidence-badge'
import dynamic from 'next/dynamic'

const QuoteDialog = dynamic(
  () => import('@/components/quotes/quote-dialog').then((m) => m.QuoteDialog),
  { ssr: false }
)
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
  confidenceScore?: number | null
  emailFrom?: string
  emailBody?: string
  emailSubject?: string
}

export function DraftSection({ emailId, userId, responseType, confidenceScore, emailFrom = '', emailBody = '', emailSubject = '' }: DraftSectionProps) {
  const [pdfIgnored, setPdfIgnored] = useState(false)
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current)
    }
  }, [])

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

  const startTypewriter = useCallback(
    (fullContent: string) => {
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current)
      setIsStreaming(true)
      setStreamingContent('')
      let idx = 0

      const tick = () => {
        if (idx >= fullContent.length) {
          updateManualContent(fullContent)
          setIsStreaming(false)
          return
        }

        const char = fullContent[idx]
        // Vary chunk: 1 char at pauses, 1-3 chars normally
        const isNewline = char === '\n'
        const isSentenceEnd = '.!?'.includes(char) && (idx + 1 >= fullContent.length || fullContent[idx + 1] === ' ' || fullContent[idx + 1] === '\n')
        const isComma = char === ','

        const chunk = isNewline || isSentenceEnd || isComma ? 1 : Math.random() < 0.4 ? 3 : Math.random() < 0.6 ? 2 : 1
        idx = Math.min(idx + chunk, fullContent.length)
        setStreamingContent(fullContent.slice(0, idx))

        // Delay: long pause after sentence end / newline, medium after comma, fast otherwise
        const delay = isSentenceEnd
          ? 120 + Math.random() * 180
          : isNewline
            ? 80 + Math.random() * 120
            : isComma
              ? 50 + Math.random() * 60
              : 18 + Math.random() * 22

        streamTimeoutRef.current = setTimeout(tick, delay)
      }

      streamTimeoutRef.current = setTimeout(tick, 0)
    },
    [updateManualContent]
  )

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
        startTypewriter(draft.content)
      }
    } finally {
      clearCreating()
    }
  }, [emailId, startCreating, failCreating, clearCreating, startTypewriter])

  if (!isComposing) return null

  return (
    <div className="space-y-3">
      {confidenceScore != null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>✨ Brouillon généré par IA</span>
          <ConfidenceBadge score={confidenceScore} size="sm" showLabel={false} />
        </div>
      )}
      {responseType === 'pdf_required' && !pdfIgnored && (
        <PdfConfirmationBlock
          onGenerate={() => setQuoteDialogOpen(true)}
          onIgnore={() => setPdfIgnored(true)}
        />
      )}
      <QuoteDialog
        open={quoteDialogOpen}
        onClose={() => setQuoteDialogOpen(false)}
        emailId={emailId}
        emailFrom={emailFrom}
        emailBody={emailBody}
        emailSubject={emailSubject}
      />
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
        isStreaming={isStreaming}
        streamingContent={streamingContent}
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
