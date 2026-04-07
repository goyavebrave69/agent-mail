"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  EllipsisVertical,
  Forward,
  Reply,
  ReplyAll,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { InboxEmail } from "@/app/(app)/inbox/page"
import { CATEGORY_BADGE, type InboxCategory } from "@/components/inbox/inbox-list"
import type { EmailCategory } from "@/types/email"

const CATEGORY_ORDER: EmailCategory[] = ["quote", "inquiry", "invoice", "follow_up", "spam", "other"]
import { DraftSection } from "@/components/draft/draft-section"
import {
  archiveEmail,
  trashEmail,
} from "@/app/(app)/inbox/[emailId]/actions"
import { useDraftStore } from "@/stores/draft-store"
import { createClient } from "@/lib/supabase/client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Draft } from "@/types/draft"

interface InboxShellProps {
  emails: InboxEmail[]
  userId: string
}

function formatRelativeDate(iso: string): string {
  const now = Date.now()
  const date = new Date(iso).getTime()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return "1 week ago"
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getSenderInitials(sender: string): string {
  const tokens = sender.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return "?"
  if (tokens.length === 1) return tokens[0][0]?.toUpperCase() ?? "?"
  return `${tokens[0][0] ?? ""}${tokens[tokens.length - 1][0] ?? ""}`.toUpperCase()
}

export function InboxShell({ emails, userId }: InboxShellProps) {
  const router = useRouter()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [search, setSearch] = useState("")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const resetDraftStore = useDraftStore((s) => s.reset)
  const startComposing = useDraftStore((s) => s.startComposing)
  const isComposing = useDraftStore((s) => s.isComposing)

  const handleArchive = async () => {
    if (!selectedEmailId || isActioning) return
    setIsActioning(true)
    setActionError(null)
    const result = await archiveEmail(selectedEmailId)
    setIsActioning(false)
    if (!result.success) {
      setActionError(result.error ?? "Archive failed. Please try again.")
    } else {
      setSelectedEmailId(null)
      router.refresh()
    }
  }

  const handleTrash = async () => {
    if (!selectedEmailId || isActioning) return
    setIsActioning(true)
    setActionError(null)
    const result = await trashEmail(selectedEmailId)
    setIsActioning(false)
    if (!result.success) {
      setActionError(result.error ?? "Trash failed. Please try again.")
    } else {
      setSelectedEmailId(null)
      router.refresh()
    }
  }

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
      .subscribe((status: string) => {
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
  }, [router, userId])

  useEffect(() => {
    resetDraftStore()
  }, [selectedEmailId, resetDraftStore])

  const filteredEmails = useMemo(() => {
    const searchQuery = search.trim().toLowerCase()
    return emails.filter((email) => {
      if (showUnreadOnly && email.is_read) return false
      if (!searchQuery) return true

      const senderName = (email.from_name ?? "").toLowerCase()
      const senderEmail = (email.from_email ?? "").toLowerCase()
      const subject = (email.subject ?? "").toLowerCase()
      const bodyPreview = (email.body_text ?? "").toLowerCase()
      return (
        senderName.includes(searchQuery) ||
        senderEmail.includes(searchQuery) ||
        subject.includes(searchQuery) ||
        bodyPreview.includes(searchQuery)
      )
    })
  }, [emails, search, showUnreadOnly])

  useEffect(() => {
    if (filteredEmails.length === 0) {
      setSelectedEmailId(null)
      return
    }
    const selectedStillVisible = filteredEmails.some((email) => email.id === selectedEmailId)
    if (!selectedStillVisible) {
      setSelectedEmailId(filteredEmails[0].id)
    }
  }, [filteredEmails, selectedEmailId])

  const groupedEmails = useMemo(
    () =>
      CATEGORY_ORDER.map((category: InboxCategory) => ({
        category,
        label: CATEGORY_BADGE[category].label,
        emails: filteredEmails.filter((email) => email.category === category),
      })).filter((group: { emails: InboxEmail[] }) => group.emails.length > 0),
    [filteredEmails]
  )

  const selectedEmail = filteredEmails.find((email) => email.id === selectedEmailId) ?? null
  const selectedSenderName = selectedEmail?.from_name ?? selectedEmail?.from_email ?? "Unknown sender"
  const selectedSenderEmail = selectedEmail?.from_email ?? "No sender email"

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Email list panel */}
      <div className="hidden w-[460px] shrink-0 flex-col border-r bg-sidebar md:flex overflow-hidden">
        <div className="flex h-[49px] shrink-0 items-center justify-between border-b px-4">
          <span className="text-base font-medium text-foreground">Inbox</span>
          <Label className="flex items-center gap-2 text-sm">
            <span>Unreads</span>
            <Switch
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
              className="shadow-none"
            />
          </Label>
        </div>
        <div className="border-b px-3 py-2">
          <Input
            placeholder="Type to search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No emails match this view.
            </div>
          ) : (
            groupedEmails.map((group) => (
              <div key={group.category} className="border-b last:border-b-0">
                <div className="sticky top-0 z-10 flex items-center justify-between border-y bg-sidebar/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{group.emails.length}</span>
                </div>
                {group.emails.map((email) => (
                  <button
                    type="button"
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`flex w-full flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent/70 ${
                      email.id === selectedEmailId ? "bg-sidebar-accent/80" : ""
                    }`}
                  >
                    <div className="flex w-full items-start gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {email.from_name ?? email.from_email ?? "Unknown sender"}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatRelativeDate(email.received_at)}
                      </span>
                    </div>
                    <span className="line-clamp-1 font-medium text-foreground/90">
                      {email.subject ?? "(no subject)"}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {email.body_text?.trim() ?? email.from_email ?? "No preview available"}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[49px] shrink-0 items-center gap-2 border-b bg-background px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/inbox">All Inboxes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Inbox</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        {!selectedEmail ? (
          <div className="flex flex-1 flex-col gap-4 bg-[#f3f2f1] p-4 md:p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-md border border-[#edebe9] bg-white/80"
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col bg-[#f6f6f7] p-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e6e6e8] bg-white">
              <div className="flex h-12 items-center justify-between border-b border-[#ececef] px-4">
                <div className="flex items-center gap-2 text-[#3b3b44]">
                  <button
                    type="button"
                    className="rounded-md p-1.5 hover:bg-[#f4f4f6] disabled:opacity-50"
                    aria-label="Reply"
                    onClick={startComposing}
                  >
                    <Reply className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 hover:bg-[#f4f4f6] disabled:opacity-50"
                    aria-label="Reply all"
                    onClick={startComposing}
                  >
                    <ReplyAll className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 hover:bg-[#f4f4f6] disabled:opacity-50"
                    aria-label="Forward"
                    onClick={startComposing}
                  >
                    <Forward className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 hover:bg-[#f4f4f6] disabled:opacity-50"
                    aria-label="Archive"
                    disabled={isActioning}
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 hover:bg-[#f4f4f6] disabled:opacity-50"
                    aria-label="Trash"
                    disabled={isActioning}
                    onClick={handleTrash}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-[#3b3b44] hover:bg-[#f4f4f6]"
                  aria-label="More actions"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
              </div>

              {actionError && (
                <Alert role="alert" variant="destructive" className="mx-4 mt-2">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              <div className="border-b border-[#ececef] px-6 py-4">
                <h2 className="text-[22px] font-semibold leading-tight text-[#24242a]">
                  {selectedEmail.subject ?? "(no subject)"}
                </h2>
              </div>

              <div className="border-b border-[#ececef] px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ececf6] text-sm font-semibold text-[#3f3f63]">
                    {getSenderInitials(selectedSenderName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#24242a]">
                      {selectedSenderName}
                    </p>
                    <p className="truncate text-sm text-[#6c6c77]">
                      Reply-To: {selectedSenderEmail}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-sm text-[#6c6c77]">
                    {formatDateTime(selectedEmail.received_at)}
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
                <div className="whitespace-pre-wrap break-words text-[28px] leading-tight text-[#2a2a32]">
                  {selectedEmail.body_text?.trim() ?? "Body not available for this email yet."}
                </div>
              </div>
            </div>

            {isComposing && (
              <div className="mt-3 rounded-xl border border-[#e6e6e8] bg-white p-4">
                <DraftSection emailId={selectedEmailId!} userId={userId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
