"use client"

import { useRouter, useSearchParams } from "next/navigation"
import type { InboxEmail } from "@/app/(app)/inbox/page"
import { CATEGORY_BADGE } from "@/components/inbox/inbox-list"

interface InboxFiltersProps {
  activeCategory: InboxEmail["category"] | null
}

const CATEGORY_ORDER: InboxEmail["category"][] = [
  "quote",
  "inquiry",
  "invoice",
  "follow_up",
  "spam",
  "other",
]

export function InboxFilters({ activeCategory }: InboxFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFilter(category: InboxEmail["category"] | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) {
      params.set("category", category)
    } else {
      params.delete("category")
    }

    const query = params.toString()
    router.push(query ? `/inbox?${query}` : "/inbox")
  }

  const baseButtonClass = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors"

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setFilter(null)}
        className={`${baseButtonClass} ${
          activeCategory === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-muted"
        }`}
      >
        All
      </button>

      {CATEGORY_ORDER.map((category) => {
        const badge = CATEGORY_BADGE[category]
        const isActive = activeCategory === category

        return (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(isActive ? null : category)}
            className={`${baseButtonClass} ${
              isActive
                ? `${badge.className} border-transparent ring-2 ring-offset-1 ring-primary/60`
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {badge.label}
          </button>
        )
      })}
    </div>
  )
}
