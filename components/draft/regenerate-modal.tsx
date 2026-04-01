'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface RegenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (instruction: string | null) => void
  isLoading: boolean
}

const MAX_INSTRUCTION_LENGTH = 200

export function RegenerateModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: RegenerateModalProps) {
  const [instruction, setInstruction] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const trimmedInstruction = instruction.trim()
  const hasText = trimmedInstruction.length > 0

  useEffect(() => {
    if (!isOpen) return
    textareaRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isLoading, isOpen, onClose])

  const counterClassName = useMemo(() => {
    if (instruction.length >= MAX_INSTRUCTION_LENGTH) return 'text-destructive'
    if (instruction.length >= 160) return 'text-amber-600'
    return 'text-muted-foreground'
  }, [instruction.length])

  if (!isOpen) return null

  const handleCloseRequest = () => {
    if (hasText) {
      const shouldClose = window.confirm('Discard your regeneration instruction?')
      if (!shouldClose) return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleCloseRequest}
      role="dialog"
      aria-modal="true"
      aria-label="Regenerate Draft"
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Regenerate Draft</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add optional instructions to guide the AI (e.g. &quot;mention our holiday hours&quot;,
          &quot;be more formal&quot;).
        </p>

        <textarea
          ref={textareaRef}
          value={instruction}
          onChange={(event) => setInstruction(event.target.value.slice(0, MAX_INSTRUCTION_LENGTH))}
          placeholder="Optional instructions..."
          rows={5}
          maxLength={MAX_INSTRUCTION_LENGTH}
          aria-label="Regeneration instructions"
          className="mt-4 w-full resize-none rounded-md border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className={`mt-1 text-xs ${counterClassName}`}>
          {instruction.length}/{MAX_INSTRUCTION_LENGTH}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCloseRequest}
            disabled={isLoading}
            className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(null)}
            disabled={isLoading}
            className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Regenerating...' : 'Regenerate without instructions'}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmedInstruction || null)}
            disabled={isLoading}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Regenerating...' : 'Regenerate with instructions'}
          </button>
        </div>
      </div>
    </div>
  )
}
