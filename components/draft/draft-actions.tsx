'use client'

import { Pencil, Send, Sparkles, Trash2 } from 'lucide-react'
import { CharacterCounter } from './character-counter'
import { RegenerateModal } from './regenerate-modal'
import type { DraftStatus } from '@/types/draft'

export interface DraftActionsProps {
  draftId: string
  status: DraftStatus
  isEditing?: boolean
  isSending?: boolean
  isRegenerating?: boolean
  showRegenerateModal?: boolean
  draftContent?: string
  editedContent?: string | null
  hasUnsavedChanges?: boolean
  onValidateAndSend: (content?: string) => void
  onEdit: () => void
  onSave?: () => void
  onCancel?: () => void
  onRegenerate: (instruction: string | null) => void
  onOpenRegenerateModal?: () => void
  onCloseRegenerateModal?: () => void
  onReject: () => void
}

export function DraftActions({
  status,
  isEditing = false,
  isSending = false,
  isRegenerating = false,
  showRegenerateModal = false,
  draftContent = '',
  editedContent = null,
  hasUnsavedChanges = false,
  onValidateAndSend,
  onEdit,
  onSave,
  onCancel,
  onRegenerate,
  onOpenRegenerateModal,
  onCloseRegenerateModal,
  onReject,
}: DraftActionsProps) {
  const isDisabled = status === 'generating' || isSending || isRegenerating
  const isEditDisabled = isDisabled || status === 'sent' || status === 'rejected'
  const currentContent = (isEditing ? (editedContent ?? draftContent) : draftContent).trim()

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <CharacterCounter count={(editedContent ?? draftContent).length} />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            onClick={onCancel}
            disabled={isSending}
            aria-label="Cancel editing draft"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSending}
            aria-label="Save draft edits"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => onValidateAndSend(editedContent ?? draftContent)}
            disabled={isSending || currentContent.length === 0}
            aria-label="Send edited draft"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          onClick={() => onValidateAndSend()}
          disabled={isDisabled || draftContent.trim().length === 0}
          aria-label="Validate and send draft"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSending ? 'Sending...' : 'Validate & Send'}
        </button>

        <button
          onClick={onEdit}
          disabled={isEditDisabled}
          aria-label="Edit draft"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </button>

        <button
          onClick={onOpenRegenerateModal}
          disabled={isDisabled}
          aria-label="Regenerate draft"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
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
      <RegenerateModal
        isOpen={showRegenerateModal}
        onClose={onCloseRegenerateModal ?? (() => {})}
        onConfirm={onRegenerate}
        isLoading={isRegenerating}
      />
    </>
  )
}
