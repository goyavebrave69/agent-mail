"use client"

import { useState, useTransition, useRef, DragEvent } from "react"
import { useRouter } from "next/navigation"
import { uploadKbFileAction } from "@/app/(app)/knowledge-base/actions"

const ACCEPTED_EXTENSIONS_ATTR = ".csv,.xls,.xlsx"
const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
const ACCEPTED_FILE_EXTENSIONS = [".csv", ".xls", ".xlsx"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

interface UploadingFile {
  id: string
  name: string
}

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex < 0) return ""
  return filename.slice(dotIndex).toLowerCase()
}

export function KbUploadZone() {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()

  function validateFile(file: File): string | null {
    const hasAcceptedMimeType = ACCEPTED_MIME_TYPES.includes(file.type)
    const hasAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.includes(getFileExtension(file.name))

    if (!hasAcceptedMimeType && !hasAcceptedExtension) {
      return `"${file.name}": unsupported format. Please upload a CSV or Excel file.`
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}": file too large (max 10 MB).`
    }
    return null
  }

  function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)
    const newErrors: string[] = []

    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        newErrors.push(validationError)
        continue
      }

      const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setUploadingFiles((prev) => [...prev, { id: uploadId, name: file.name }])

      const formData = new FormData()
      formData.set("file", file)

      startTransition(async () => {
        try {
          const result = await uploadKbFileAction(formData)
          if ("error" in result) {
            setErrors((prev) => [...prev, result.error])
          } else {
            router.refresh()
          }
        } catch {
          setErrors((prev) => [...prev, `Failed to upload "${file.name}". Please try again.`])
        } finally {
          setUploadingFiles((prev) => prev.filter((uploadingFile) => uploadingFile.id !== uploadId))
        }
      })
    }

    if (newErrors.length > 0) {
      setErrors((prev) => [...prev, ...newErrors])
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      setErrors([])
      handleFiles(e.dataTransfer.files)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setErrors([])
      handleFiles(e.target.files)
      e.target.value = ""
    }
  }

  const isUploading = isPending || uploadingFiles.length > 0

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          isUploading ? "pointer-events-none opacity-60" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS_ATTR}
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              Uploading {uploadingFiles[0]?.name ?? "file"}…
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Indexing will start automatically.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag &amp; drop files here, or{" "}
              <span className="text-primary underline underline-offset-2">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">CSV, XLS, XLSX — max 10 MB each</p>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="text-sm text-destructive">
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
