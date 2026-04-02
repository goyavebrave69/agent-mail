"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Archive,
  Circle,
  Clock3,
  EllipsisVertical,
  FileText,
  Forward,
  Inbox as InboxIcon,
  MessageSquare,
  Receipt,
  Reply,
  ReplyAll,
  SendHorizontal,
  ShieldAlert,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { InboxEmail } from "@/app/(app)/inbox/page"
import { CATEGORY_BADGE, type InboxCategory } from "@/components/inbox/inbox-list"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type CategoryMenuItem = {
  key: InboxCategory | "all"
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const CATEGORY_MENU: CategoryMenuItem[] = [
  { key: "all", label: "All", icon: InboxIcon },
  { key: "quote", label: CATEGORY_BADGE.quote.label, icon: FileText },
  { key: "inquiry", label: CATEGORY_BADGE.inquiry.label, icon: MessageSquare },
  { key: "invoice", label: CATEGORY_BADGE.invoice.label, icon: Receipt },
  { key: "follow_up", label: CATEGORY_BADGE.follow_up.label, icon: Reply },
  { key: "spam", label: CATEGORY_BADGE.spam.label, icon: ShieldAlert },
  { key: "other", label: CATEGORY_BADGE.other.label, icon: Circle },
]
const CATEGORY_ORDER: InboxCategory[] = ["quote", "inquiry", "invoice", "follow_up", "spam", "other"]

interface InboxShellProps {
  emails: InboxEmail[]
  userId: string
  activeCategory: InboxCategory | null
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
  const tokens = sender
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return "?"
  if (tokens.length === 1) return tokens[0][0]?.toUpperCase() ?? "?"
  return `${tokens[0][0] ?? ""}${tokens[tokens.length - 1][0] ?? ""}`.toUpperCase()
}

export function InboxShell({
  emails,
  userId,
  activeCategory,
}: InboxShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [search, setSearch] = useState("")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [muteThread, setMuteThread] = useState(false)

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
  }, [router, userId])

  const filteredEmails = useMemo(() => {
    const searchQuery = search.trim().toLowerCase()
    return emails.filter((email) => {
      if (showUnreadOnly && email.is_read) return false
      if (!searchQuery) return true

      const sender = (email.from_name ?? email.from_email ?? "").toLowerCase()
      const subject = (email.subject ?? "").toLowerCase()
      return sender.includes(searchQuery) || subject.includes(searchQuery)
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

  const activeKey: InboxCategory | "all" = activeCategory ?? "all"
  const selectedEmail = filteredEmails.find((email) => email.id === selectedEmailId) ?? null
  const selectedSenderName = selectedEmail?.from_name ?? selectedEmail?.from_email ?? "Unknown sender"
  const selectedSenderEmail = selectedEmail?.from_email ?? "No sender email"
  const groupedEmails = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_BADGE[category].label,
        emails: filteredEmails.filter((email) => email.category === category),
      })).filter((group) => group.emails.length > 0),
    [filteredEmails]
  )

  const setCategory = (key: InboxCategory | "all") => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === "all") {
      params.delete("category")
    } else {
      params.set("category", key)
    }
    const query = params.toString()
    router.push(query ? `/inbox?${query}` : "/inbox")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-svh w-full overflow-hidden">
        {/* Category icon rail */}
        <div className="flex w-[49px] shrink-0 flex-col border-r bg-sidebar">
          <div className="h-[49px] shrink-0 border-b" />
          <div className="flex flex-1 flex-col items-center gap-1 py-2">
            {CATEGORY_MENU.map((item) => (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCategory(item.key)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                      activeKey === item.key
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="sr-only">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

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
                      className="rounded-md p-1.5 hover:bg-[#f4f4f6]"
                      aria-label="Reply"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-[#f4f4f6]"
                      aria-label="Reply all"
                    >
                      <ReplyAll className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-[#f4f4f6]"
                      aria-label="Forward"
                    >
                      <Forward className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-[#f4f4f6]"
                      aria-label="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 hover:bg-[#f4f4f6]"
                      aria-label="Snooze"
                    >
                      <Clock3 className="h-4 w-4" />
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

              <div className="mt-3 rounded-xl border border-[#e6e6e8] bg-white p-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply ${selectedSenderName}...`}
                  className="h-24 w-full resize-none rounded-lg border border-[#e8e8eb] bg-[#fafafb] px-4 py-3 text-sm text-[#2a2a32] outline-none placeholder:text-[#9a9aa4] focus:border-[#cfcfe6]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-2 text-sm font-normal text-[#5f5f69]">
                    <Switch
                      checked={muteThread}
                      onCheckedChange={setMuteThread}
                      className="shadow-none"
                    />
                    <span>Mute this thread</span>
                  </Label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-[#202027] px-4 py-2 text-sm font-medium text-white hover:bg-[#15151b]"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
