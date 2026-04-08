'use client'

import { useEffect, useRef } from 'react'
import type { ComposeMode } from '@/stores/draft-store'

interface ManualComposeProps {
  emailId: string
  mode: ComposeMode | null
  composeTo: string
  composeSubject: string
  composeQuotedBody: string
  onToChange: (to: string) => void
  onSubjectChange: (subject: string) => void
  onSend: (content: string) => void
  onCancel: () => void
  isSending?: boolean
  sendError?: string | null
  manualContent: string
  onContentChange: (content: string) => void
  onCreateDraft?: () => void
  isCreating?: boolean
}

const MAX_LENGTH = 10_000

export function ManualCompose({
  mode,
  composeTo,
  composeSubject,
  onToChange,
  onSubjectChange,
  onSend,
  onCancel,
  isSending = false,
  sendError,
  manualContent,
  onContentChange,
  onCreateDraft,
  isCreating = false,
}: ManualComposeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const target = event.currentTarget
    const start = target.selectionStart
    const end = target.selectionEnd
    const next = `${manualContent.slice(0, start)}  ${manualContent.slice(end)}`
    onContentChange(next)
    requestAnimationFrame(() => {
      target.selectionStart = start + 2
      target.selectionEnd = start + 2
    })
  }

  const trimmed = manualContent.trim()
  const toTrimmed = composeTo.trim()
  const isDisabled = !trimmed || !toTrimmed || isSending

  const modeLabel = mode === 'forward' ? 'Forward' : mode === 'replyAll' ? 'Reply All' : 'Reply'

  return (
    <div className="space-y-3" role="region" aria-label={`${modeLabel} compose`}>
      {/* To field */}
      <div className="flex items-center gap-2 border-b pb-2">
        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">To</span>
        <input
          type="email"
          value={composeTo}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="recipient@example.com"
          disabled={isSending}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          aria-label="To"
        />
      </div>

      {/* Subject field — editable for forward, read-only for reply */}
      <div className="flex items-center gap-2 border-b pb-2">
        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Subject</span>
        {mode === 'forward' ? (
          <input
            type="text"
            value={composeSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            aria-label="Subject"
          />
        ) : (
          <span className="flex-1 truncate text-sm text-muted-foreground">{composeSubject}</span>
        )}
      </div>

      {/* Body textarea */}
      <textarea
        ref={textareaRef}
        value={manualContent}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your message..."
        className="w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        rows={8}
        maxLength={MAX_LENGTH}
        aria-label="Message body"
        disabled={isSending}
      />

      {/* Quoted original email */}
      

      {sendError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3" role="alert">
          <p className="text-sm font-medium text-destructive">{sendError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSending || isCreating}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancel"
        >
          Cancel
        </button>
        {onCreateDraft && mode !== 'forward' && (
          <button
            onClick={onCreateDraft}
            disabled={isCreating || isSending}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? 'Generating…' : 'Réponse'}
          </button>
        )}
        <button
          onClick={() => onSend(manualContent)}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Send ${modeLabel.toLowerCase()}`}
        >
          {isSending ? 'Sending…' : modeLabel === 'Forward' ? 'Forward' : 'Send'}
        </button>
      </div>
    </div>
  )
}
