"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { KbFile } from "@/app/(app)/knowledge-base/page"
import { retriggerIndexKbAction } from "@/app/(app)/knowledge-base/actions"

interface KbFileListProps {
  files: KbFile[]
}

const STATUS_BADGE: Record<KbFile["status"], { label: string; className: string }> = {
  pending: { label: "Indexing…", className: "bg-yellow-100 text-yellow-800" },
  ready: { label: "Ready", className: "bg-green-100 text-green-800" },
  error: { label: "Error", className: "bg-red-100 text-red-800" },
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

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No files uploaded yet. Upload a CSV or Excel file above.
      </p>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Uploaded Files</h2>
      {retryError && (
        <p className="mb-2 text-xs text-destructive">{retryError}</p>
      )}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">File</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Uploaded</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Size</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const badge = STATUS_BADGE[file.status]
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
                    {file.status === "error" && (
                      <button
                        onClick={() => handleRetry(file.id)}
                        disabled={isPending}
                        className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
                      >
                        {isPending ? "Retrying…" : "Retry"}
                      </button>
                    )}
                    {/* Delete button added in story 3.4 */}
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
