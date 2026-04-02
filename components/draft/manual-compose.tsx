'use client'

import { useEffect, useRef } from 'react'

interface ManualComposeProps {
  emailId: string
  onSend: (content: string) => void
  onCancel: () => void
  isSending?: boolean
  sendError?: string | null
  manualContent: string
  onContentChange: (content: string) => void
}

const MAX_LENGTH = 10_000

export function ManualCompose({
  onSend,
  onCancel,
  isSending = false,
  sendError,
  manualContent,
  onContentChange,
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
  const isDisabled = !trimmed || isSending

  return (
    <div className="space-y-3" role="region" aria-label="Write your own reply">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Draft rejected — write your own reply</span>
      </div>

      <textarea
        ref={textareaRef}
        value={manualContent}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your reply..."
        className="w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        rows={10}
        maxLength={MAX_LENGTH}
        aria-label="Write your reply"
        disabled={isSending}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {manualContent.length} / {MAX_LENGTH} characters
        </span>
      </div>

      {sendError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3" role="alert">
          <p className="text-sm font-medium text-destructive">{sendError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSending}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cancel reply"
        >
          Cancel
        </button>
        <button
          onClick={() => onSend(manualContent)}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send reply"
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
