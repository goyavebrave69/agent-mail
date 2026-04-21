"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { KbFile } from "@/app/(app)/knowledge-base/page"
import { retriggerIndexKbAction, deleteKbFileAction } from "@/app/(app)/knowledge-base/actions"

interface KbFileListProps {
  files: KbFile[]
}

const STATUS_BADGE: Record<KbFile["status"], { label: string; className: string }> = {
  pending: { label: "Indexation…", className: "bg-yellow-100 text-yellow-800" },
  ready: { label: "Prêt", className: "bg-green-100 text-green-800" },
  error: { label: "Erreur", className: "bg-red-100 text-red-800" },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function KbFileList({ files }: KbFileListProps) {
  const [isPending, startTransition] = useTransition()
  const [retryError, setRetryError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const router = useRouter()

  function handleRetry(id: string) {
    setRetryError(null)
    startTransition(async () => {
      const result = await retriggerIndexKbAction(id)
      if ("error" in result) {
        setRetryError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  async function handleDeleteConfirm(id: string) {
    setConfirmingId(null)
    setDeleteError(null)
    setIsDeletingId(id)
    try {
      const result = await deleteKbFileAction(id)
      if ("error" in result) {
        setDeleteError(result.error)
      } else {
        router.refresh()
      }
    } catch {
      setDeleteError("Impossible de supprimer le fichier. Veuillez réessayer.")
    } finally {
      setIsDeletingId(null)
    }
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun fichier importé. Importez un fichier CSV ou Excel ci-dessus.
      </p>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Fichiers importés</h2>
      {retryError && (
        <p className="mb-2 text-xs text-destructive">{retryError}</p>
      )}
      {deleteError && (
        <p className="mb-2 text-xs text-destructive">{deleteError}</p>
      )}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fichier</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Importé</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Taille</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const badge = STATUS_BADGE[file.status]
              const isDeleting = isDeletingId === file.id
              const isConfirming = confirmingId === file.id
              return (
                <tr key={file.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{file.filename}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(file.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBytes(file.file_size)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {file.status === "error" && file.error_message && (
                      <p className="mt-1 text-xs text-destructive">{file.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {file.status === "error" && (
                        <button
                          onClick={() => handleRetry(file.id)}
                          disabled={isPending || isDeleting}
                          className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
                        >
                          {isPending ? "Nouvelle tentative…" : "Réessayer"}
                        </button>
                      )}
                      {isConfirming ? (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">Confirmer ?</span>
                          <button
                            onClick={() => handleDeleteConfirm(file.id)}
                            className="text-destructive underline hover:no-underline"
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="text-muted-foreground underline hover:no-underline"
                          >
                            Non
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(file.id)}
                          disabled={isDeleting || isPending}
                          className="text-xs text-muted-foreground underline hover:text-destructive hover:no-underline disabled:opacity-50"
                        >
                          {isDeleting ? "Suppression…" : "Supprimer"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
