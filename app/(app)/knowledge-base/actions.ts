"use server"

import { createClient } from "@/lib/supabase/server"

const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"]
const EXTENSION_TO_MIME: Record<string, string> = {
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex < 0) return ""
  return filename.slice(dotIndex).toLowerCase()
}

function inferMimeType(filename: string): string | null {
  const extension = getFileExtension(filename)
  return EXTENSION_TO_MIME[extension] ?? null
}

export interface KbFileRecord {
  id: string
  filename: string
  status: string
}

export async function uploadKbFileAction(
  formData: FormData
): Promise<KbFileRecord | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const file = formData.get("file") as File | null
  if (!file) return { error: "No file provided" }

  const hasAcceptedMimeType = ACCEPTED_MIME_TYPES.includes(file.type)
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.includes(getFileExtension(file.name))

  if (!hasAcceptedMimeType && !hasAcceptedExtension) {
    return {
      error: `Unsupported file type: ${file.type || "unknown"}. Please upload a CSV or Excel file (.csv, .xls, .xlsx).`,
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: `File too large. Maximum size is 10 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).` }
  }

  const storagePath = `${user.id}/${Date.now()}-${file.name}`
  const uploadContentType = hasAcceptedMimeType ? file.type : (inferMimeType(file.name) ?? file.type)

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(storagePath, file, { contentType: uploadContentType, upsert: false })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("kb_files")
    .insert({
      user_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      status: "pending",
    })
    .select("id, filename, status")
    .single()

  if (insertError || !inserted) {
    // Best-effort cleanup of the uploaded file
    await supabase.storage.from("knowledge-base").remove([storagePath])
    return { error: `Failed to record file: ${insertError?.message ?? "unknown error"}` }
  }

  return { id: inserted.id, filename: inserted.filename, status: inserted.status }
}
