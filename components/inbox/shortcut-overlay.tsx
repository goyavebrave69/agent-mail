"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const SHORTCUTS = [
  { key: "e", label: "Archiver" },
  { key: "#", label: "Supprimer" },
  { key: "u", label: "Marquer non lu" },
  { key: "s", label: "Étoiler / Désétouiler" },
  { key: "c", label: "Nouveau message" },
  { key: "?", label: "Afficher les raccourcis" },
]

interface ShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2">
          {SHORTCUTS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                {key}
              </kbd>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
