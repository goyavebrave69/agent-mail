'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DraftEditor } from './draft-editor'
import { DraftRealtime } from './draft-realtime'
import { validateAndSendDraft } from '@/app/(app)/inbox/[emailId]/actions'
import { useDraftStore } from '@/stores/draft-store'
import type { Draft } from '@/types/draft'

interface DraftSectionProps {
  draft: Draft | null
  emailId: string
  userId: string
}

export function DraftSection({ draft: initialDraft, userId }: DraftSectionProps) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft)
  const router = useRouter()
  const { optimisticSend, confirmSend, failSend } = useDraftStore()

  const handleDraftUpdate = useCallback((updated: Draft) => {
    setDraft(updated)
  }, [])

  const handleValidateAndSend = useCallback(async () => {
    if (!draft) return

    optimisticSend()
    const result = await validateAndSendDraft(draft.id)

    if (result.success) {
      confirmSend()
      setDraft((current) => current ? { ...current, status: 'sent' } : current)
      router.push('/inbox')
      router.refresh()
      return
    }

    failSend(result.error ?? 'Failed to send email. Please try again.')
  }, [confirmSend, draft, failSend, optimisticSend, router])

  const handleRegenerate = useCallback(() => {
    // Story 5-5 will implement regeneration
    router.refresh()
  }, [router])

  const handleReject = useCallback(() => {
    // Story 5-6 will implement rejection
    router.refresh()
  }, [router])

  if (!draft) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No draft available yet.
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
        onRegenerate={handleRegenerate}
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
