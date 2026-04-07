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
  rawName: string
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

  const { data: createdCategory, error: createError } = await supabase
    .from("custom_categories")
    .insert({
      user_id: user.id,
      name: normalizedName,
      slug,
    })
    .select("id, name, slug")
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
