'use client'

import { Pencil, Send, Sparkles, Trash2 } from 'lucide-react'
import type { DraftStatus } from '@/types/draft'

export interface DraftActionsProps {
  draftId: string
  status: DraftStatus
  onValidateAndSend: () => void
  onEdit: () => void
  onRegenerate: () => void
  onReject: () => void
}

export function DraftActions({
  status,
  onValidateAndSend,
  onEdit,
  onRegenerate,
  onReject,
}: DraftActionsProps) {
  const isDisabled = status === 'generating'

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <button
        onClick={onValidateAndSend}
        disabled={isDisabled}
        aria-label="Validate and send draft"
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        Validate &amp; Send
      </button>

      <button
        onClick={onEdit}
        disabled={isDisabled}
        aria-label="Edit draft"
        className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit
      </button>

      <button
        onClick={onRegenerate}
        disabled={isDisabled}
        aria-label="Regenerate draft"
        className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Regenerate
      </button>

      <button
        onClick={onReject}
        disabled={isDisabled}
        aria-label="Reject draft"
        className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Reject
      </button>
    </div>
  )
}
