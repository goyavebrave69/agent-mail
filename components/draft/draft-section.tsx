'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DraftEditor } from './draft-editor'
import { DraftRealtime } from './draft-realtime'
import { updateDraftContent, validateAndSendDraft } from '@/app/(app)/inbox/[emailId]/actions'
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

  const handleValidateAndSend = useCallback(async (content?: string) => {
    if (!draft) return

    optimisticSend()
    const result = await validateAndSendDraft(draft.id, content)

    if (result.success) {
      confirmSend()
      setDraft((current) => current ? {
        ...current,
        content: content ?? current.content,
        status: 'sent',
      } : current)
      router.push('/inbox')
      router.refresh()
      return
    }

    failSend(result.error ?? 'Failed to send email. Please try again.')
  }, [confirmSend, draft, failSend, optimisticSend, router])

  const handleSaveEdit = useCallback(async (content: string) => {
    if (!draft) return

    const result = await updateDraftContent(draft.id, content)
    if (!result.success) {
      throw new Error(result.error ?? 'Unable to save draft edits.')
    }

    setDraft((current) => current ? { ...current, content } : current)
    router.refresh()
  }, [draft, router])

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
        onSaveEdit={handleSaveEdit}
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
