"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailViaProvider } from "@/lib/email/send"
import type { SendEmailResult } from "@/lib/email/send"
import {
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  isSystemInboxCategory,
  normalizeCustomCategoryName,
  toCustomCategorySlug,
  type CustomCategory,
} from "@/lib/inbox/custom-categories"

export interface CreateCustomCategoryResult {
  success: boolean
  error?: string
  category?: CustomCategory
}

export async function createCustomCategoryAction(
  rawName: string,
  description?: string
): Promise<CreateCustomCategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const normalizedName = normalizeCustomCategoryName(rawName ?? "")
  if (!normalizedName) {
    return { success: false, error: "Category name is required." }
  }

  if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
    return {
      success: false,
      error: `Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.`,
    }
  }

  const slug = toCustomCategorySlug(normalizedName)
  if (!slug) {
    return {
      success: false,
      error: "Category name must contain at least one letter or number.",
    }
  }

  if (isSystemInboxCategory(slug)) {
    return { success: false, error: "Category already exists." }
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from("custom_categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle()

  if (existingCategory) {
    return { success: false, error: "Category already exists." }
  }

  if (existingCategoryError) {
    console.warn("[createCustomCategoryAction] duplicate pre-check failed", existingCategoryError.message)
  }

  const normalizedDescription = description?.trim() || null

  const { data: createdCategory, error: createError } = await supabase
    .from("custom_categories")
    .insert({
      user_id: user.id,
      name: normalizedName,
      slug,
      ...(normalizedDescription !== null && { description: normalizedDescription }),
    })
    .select("id, name, slug, description")
    .single()

  if (createError?.code === "23505") {
    return { success: false, error: "Category already exists." }
  }

  if (createError?.code === "42P01") {
    return {
      success: false,
      error: "Custom categories are not available yet. Apply the latest database migrations.",
    }
  }

  if (createError || !createdCategory) {
    return { success: false, error: "Unable to create category. Please try again." }
  }

  revalidatePath("/inbox")

  return {
    success: true,
    category: createdCategory as CustomCategory,
  }
}

export interface MutateCustomCategoryResult {
  success: boolean
  error?: string
}

export async function renameCustomCategoryAction(
  id: string,
  rawName: string
): Promise<MutateCustomCategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const normalizedName = normalizeCustomCategoryName(rawName ?? "")
  if (!normalizedName) return { success: false, error: "Category name is required." }
  if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
    return { success: false, error: `Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.` }
  }

  const slug = toCustomCategorySlug(normalizedName)
  if (!slug) return { success: false, error: "Category name must contain at least one letter or number." }

  const { error } = await supabase
    .from("custom_categories")
    .update({ name: normalizedName, slug })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { success: false, error: "Unable to rename category. Please try again." }

  revalidatePath("/inbox")
  return { success: true }
}

export async function updateCustomCategoryAction(
  id: string,
  rawName: string,
  description?: string
): Promise<MutateCustomCategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const normalizedName = normalizeCustomCategoryName(rawName ?? "")
  if (!normalizedName) return { success: false, error: "Category name is required." }
  if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
    return { success: false, error: `Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.` }
  }

  const slug = toCustomCategorySlug(normalizedName)
  if (!slug) return { success: false, error: "Category name must contain at least one letter or number." }

  const normalizedDescription = description?.trim() ?? null

  const { error } = await supabase
    .from("custom_categories")
    .update({ name: normalizedName, slug, description: normalizedDescription })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { success: false, error: "Unable to update category. Please try again." }

  revalidatePath("/inbox")
  return { success: true }
}

export async function deleteCustomCategoryAction(
  id: string
): Promise<MutateCustomCategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("custom_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { success: false, error: "Unable to delete category. Please try again." }

  revalidatePath("/inbox")
  return { success: true }
}

// ─── Send new email ───────────────────────────────────────────────────────────

interface SendNewEmailParams {
  to: string
  subject: string
  body: string
  isHtml?: boolean
  cc?: string
  bcc?: string
}

export async function sendNewEmail(params: SendNewEmailParams): Promise<SendEmailResult> {
  const { to, subject, body, isHtml } = params

  const sanitizedBody = body.trim()
  if (!sanitizedBody) {
    return { success: false, error: 'Le corps du message est requis.', errorCode: 'UNKNOWN' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.', errorCode: 'UNKNOWN' }

  const { data: connection } = await supabase
    .from('email_connections')
    .select('provider, email, vault_secret_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!connection) {
    return {
      success: false,
      error: 'Aucune connexion email trouvée. Veuillez reconnecter votre boîte mail.',
      errorCode: 'NO_CONNECTION',
    }
  }

  const adminClient = createAdminClient()
  const { data: secretData } = await adminClient.rpc('read_vault_secret', {
    secret_id: connection.vault_secret_id,
  })

  let credentials: unknown
  try {
    credentials = JSON.parse(secretData as string)
  } catch {
    return { success: false, error: 'Impossible de lire les identifiants de connexion.', errorCode: 'UNKNOWN' }
  }

  const result = await sendEmailViaProvider(
    connection.provider as 'gmail' | 'outlook' | 'imap',
    credentials as Parameters<typeof sendEmailViaProvider>[1],
    {
      to,
      from: connection.email,
      subject: subject || '(sans objet)',
      body: sanitizedBody,
      isHtml,
    }
  )

  if (result.success) {
    revalidatePath('/inbox')
  }

  return result
}

export async function triggerSyncAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: "Missing env vars" }
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/sync-emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    return { success: false, error: `Sync failed: ${res.status}` }
  }

  return { success: true }
}

export async function reorderCustomCategoriesAction(
  orderedIds: string[]
): Promise<MutateCustomCategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("custom_categories")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id)
  )

  await Promise.all(updates)

  revalidatePath("/inbox")
  return { success: true }
}
