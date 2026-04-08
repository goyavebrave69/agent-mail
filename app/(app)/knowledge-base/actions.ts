"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const MAX_PROFILE_DESCRIPTION_LENGTH = 2000

export async function getUserProfileAction(): Promise<{ description: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data } = await supabase
    .from("user_profile")
    .select("description")
    .eq("user_id", user.id)
    .maybeSingle()

  return { description: data?.description ?? "" }
}

export async function saveUserProfileAction(
  description: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const trimmed = description.trim()
  if (trimmed.length > MAX_PROFILE_DESCRIPTION_LENGTH) {
    return { error: `Description must be ${MAX_PROFILE_DESCRIPTION_LENGTH} characters or fewer.` }
  }

  const { error } = await supabase
    .from("user_profile")
    .upsert({ user_id: user.id, description: trimmed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)

  if (error) return { error: `Failed to save profile: ${error.message}` }

  revalidatePath("/knowledge-base")
  return { success: true }
}

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

  // Fire-and-forget: trigger the index-kb Edge Function asynchronously
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/index-kb`
  fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ kb_file_id: inserted.id }),
  }).catch((err: unknown) => console.error("[index-kb trigger]", err))

  return { id: inserted.id, filename: inserted.filename, status: inserted.status }
}

export async function retriggerIndexKbAction(
  kbFileId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: kbFile, error: fetchError } = await supabase
    .from("kb_files")
    .select("id, user_id, status")
    .eq("id", kbFileId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !kbFile) return { error: "Not found" }
  if (kbFile.status !== "error") return { error: "File is not in error state" }

  const { data: updated, error: updateError } = await supabase
    .from("kb_files")
    .update({ status: "pending", error_message: null })
    .eq("id", kbFileId)
    .eq("user_id", user.id)
    .select("id, status")

  if (updateError) return { error: `Failed to reset status: ${updateError.message}` }
  if (!updated || updated.length === 0) return { error: "Update matched no rows" }

  revalidatePath("/knowledge-base")

  // Fire-and-forget: re-trigger the index-kb Edge Function
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/index-kb`
  fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ kb_file_id: kbFileId }),
  }).catch((err: unknown) => console.error("[index-kb retrigger]", err))

  return { success: true }
}

export async function deleteKbFileAction(
  kbFileId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: kbFile, error: fetchError } = await supabase
    .from("kb_files")
    .select("id, user_id, filename, storage_path, file_size, mime_type")
    .eq("id", kbFileId)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !kbFile) return { error: "Not found" }

  const { data: deleted, error: deleteError } = await supabase
    .from("kb_files")
    .delete()
    .eq("id", kbFileId)
    .eq("user_id", user.id)
    .select("id")

  if (deleteError) return { error: `Failed to delete record: ${deleteError.message}` }
  if (!deleted || deleted.length === 0) return { error: "Delete matched no rows" }

  const { error: storageError } = await supabase.storage
    .from("knowledge-base")
    .remove([kbFile.storage_path])

  if (storageError) {
    const { error: rollbackError } = await supabase.from("kb_files").insert({
      id: kbFile.id,
      user_id: kbFile.user_id,
      filename: kbFile.filename,
      storage_path: kbFile.storage_path,
      file_size: kbFile.file_size,
      mime_type: kbFile.mime_type,
      status: "error",
      error_message: `Delete rollback after storage failure: ${storageError.message}`,
    })

    if (rollbackError) {
      return {
        error: `Failed to delete file: ${storageError.message}. Rollback failed: ${rollbackError.message}`,
      }
    }

    return { error: `Failed to delete file: ${storageError.message}` }
  }

  const { error: embeddingsError } = await supabase
    .from("embeddings")
    .delete()
    .eq("kb_file_id", kbFileId)
    .eq("user_id", user.id)

  if (embeddingsError) {
    console.error("[deleteKbFile] embeddings delete error:", embeddingsError.message)
  }

  revalidatePath("/knowledge-base")

  return { success: true }
}
