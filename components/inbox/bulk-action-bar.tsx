"use client"

import { Archive, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BulkActionBarProps {
  selectedCount: number
  onArchive: () => void
  onTrash: () => void
  onDeselect: () => void
  isProcessing?: boolean
}

export function BulkActionBar({
  selectedCount,
  onArchive,
  onTrash,
  onDeselect,
  isProcessing = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="flex items-center gap-2 border-t bg-background px-3 py-2"
      role="toolbar"
      aria-label="Actions groupées"
    >
      <span className="mr-1 text-xs font-medium text-muted-foreground">
        {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onArchive}
        disabled={isProcessing}
        className="h-7 gap-1.5 text-xs"
        aria-label="Archiver la sélection"
      >
        <Archive className="h-3.5 w-3.5" />
        Archiver
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onTrash}
        disabled={isProcessing}
        className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
        aria-label="Supprimer la sélection"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </Button>
      <button
        type="button"
        onClick={onDeselect}
        disabled={isProcessing}
        className="ml-auto text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        Tout désélectionner
      </button>
    </div>
  )
}
