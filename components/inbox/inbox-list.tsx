"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { InboxEmail } from "@/app/(app)/inbox/page"

interface InboxListProps {
  emails: InboxEmail[]
  userId: string
  activeCategory: InboxEmail["category"] | null
}

export const CATEGORY_BADGE: Record<InboxEmail["category"], { label: string; className: string }> = {
  quote: { label: "Quote", className: "bg-blue-100 text-blue-800" },
  invoice: { label: "Invoice", className: "bg-orange-100 text-orange-800" },
  inquiry: { label: "Inquiry", className: "bg-purple-100 text-purple-800" },
  follow_up: { label: "Follow-up", className: "bg-yellow-100 text-yellow-800" },
  spam: { label: "Spam", className: "bg-red-100 text-red-800" },
  other: { label: "Other", className: "bg-gray-100 text-gray-700" },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function InboxList({ emails, userId, activeCategory }: InboxListProps) {
  const router = useRouter()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    const startPolling = () => {
      if (!isMounted || pollingRef.current) return
      pollingRef.current = setInterval(() => router.refresh(), 30_000)
    }

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emails",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh()
      )
      .subscribe((status) => {
        if (!isMounted) return

        if (status === "SUBSCRIBED") {
          stopPolling()
        } else {
          startPolling()
        }
      })

    return () => {
      isMounted = false
      stopPolling()
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  if (emails.length === 0) {
    if (activeCategory) {
      const activeLabel = CATEGORY_BADGE[activeCategory].label
      return (
        <p className="text-sm text-muted-foreground">
          No {activeLabel.toLowerCase()} emails match this filter. Clear the filter to see all emails.
        </p>
      )
    }

    return (
      <p className="text-sm text-muted-foreground">
        No emails yet. Connect a mailbox in Settings to start syncing.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <ul>
        {emails.map((email) => {
          const badge = CATEGORY_BADGE[email.category]
          return (
            <li
              key={email.id}
              className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 ${
                email.is_read ? "opacity-60" : ""
              }`}
            >
              {!email.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              {email.is_read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {email.from_name ?? email.from_email ?? "Unknown sender"}
                  </span>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {email.subject ?? "(no subject)"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(email.received_at)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
