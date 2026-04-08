"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
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
