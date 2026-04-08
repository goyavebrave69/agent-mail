import type { EmailCategory } from "@/types/email"

export interface CustomCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  sort_order?: number
}

export const SYSTEM_INBOX_CATEGORIES: EmailCategory[] = [
  "quote",
  "inquiry",
  "invoice",
  "follow_up",
  "spam",
  "other",
]

export const MAX_CUSTOM_CATEGORY_NAME_LENGTH = 40

const SYSTEM_CATEGORY_SET = new Set<string>(SYSTEM_INBOX_CATEGORIES)

export function isSystemInboxCategory(value: string): value is EmailCategory {
  return SYSTEM_CATEGORY_SET.has(value)
}

export function normalizeCustomCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function toCustomCategorySlug(value: string): string {
  return normalizeCustomCategoryName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}
