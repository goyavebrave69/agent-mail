"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Archive,
  Circle,
  EllipsisVertical,
  FileText,
  Forward,
  Inbox as InboxIcon,
  MessageSquare,
  PanelLeft,
  Pencil,
  Receipt,
  Reply,
  ReplyAll,
  Send as SendIcon,
  Settings2,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { InboxEmail } from "@/app/(app)/inbox/page"
import { CATEGORY_BADGE, type InboxCategory } from "@/components/inbox/inbox-list"
import { DraftSection } from "@/components/draft/draft-section"
import {
  archiveEmail,
  fetchDraftForEmail,
  trashEmail,
} from "@/app/(app)/inbox/[emailId]/actions"
import { useDraftStore } from "@/stores/draft-store"
import type { Draft } from "@/types/draft"
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
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createCustomCategoryAction } from "@/app/(app)/inbox/actions"
import {
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  isSystemInboxCategory,
  normalizeCustomCategoryName,
  toCustomCategorySlug,
  type CustomCategory,
} from "@/lib/inbox/custom-categories"

type CategoryMenuItem = {
  key: InboxCategory | string | "all"
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SYSTEM_CATEGORY_MENU: CategoryMenuItem[] = [
  { key: "quote", label: CATEGORY_BADGE.quote.label, icon: FileText },
  { key: "inquiry", label: CATEGORY_BADGE.inquiry.label, icon: MessageSquare },
  { key: "invoice", label: CATEGORY_BADGE.invoice.label, icon: Receipt },
  { key: "follow_up", label: CATEGORY_BADGE.follow_up.label, icon: Reply },
  { key: "spam", label: CATEGORY_BADGE.spam.label, icon: ShieldAlert },
  { key: "other", label: CATEGORY_BADGE.other.label, icon: Circle },
]
const CATEGORY_ORDER: InboxCategory[] = ["quote", "inquiry", "invoice", "follow_up", "spam", "other"]

const SESSION_KEY = "inbox_sidebar_collapsed"

type PrimaryNavItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  { key: "inbox", label: "Inbox", icon: InboxIcon, href: "/inbox" },
  { key: "drafts", label: "Drafts", icon: Pencil, href: "#" },
  { key: "sent", label: "Sent", icon: SendIcon, href: "#" },
  { key: "trash", label: "Trash", icon: Trash2, href: "#" },
]

interface InboxShellProps {
  emails: InboxEmail[]
  userId: string
  activeCategory: string | null
  customCategories: CustomCategory[]
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
  customCategories,
}: InboxShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [search, setSearch] = useState("")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null)
  const [customCategoriesState, setCustomCategoriesState] = useState<CustomCategory[]>(customCategories)
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)
  const resetDraftStore = useDraftStore((s) => s.reset)
  const startComposing = useDraftStore((s) => s.startComposing)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(SESSION_KEY) === "true"
  })

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    sessionStorage.setItem(SESSION_KEY, String(next))
  }

  const handleArchive = async () => {
    if (!selectedEmailId || isActioning) return
    setIsActioning(true)
    setActionError(null)
    try {
      const result = await archiveEmail(selectedEmailId)
      if (!result.success) {
        setActionError(result.error ?? "Archive failed. Please try again.")
        return
      }

      setSelectedEmailId(null)
      router.refresh()
    } catch {
      setActionError("Archive failed. Please try again.")
    } finally {
      setIsActioning(false)
    }
  }

  const handleTrash = async () => {
    if (!selectedEmailId || isActioning) return
    setIsActioning(true)
    setActionError(null)
    try {
      const result = await trashEmail(selectedEmailId)
      if (!result.success) {
        setActionError(result.error ?? "Trash failed. Please try again.")
        return
      }

      setSelectedEmailId(null)
      router.refresh()
    } catch {
      setActionError("Trash failed. Please try again.")
    } finally {
      setIsActioning(false)
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

  useEffect(() => {
    setCustomCategoriesState(customCategories)
  }, [customCategories])

  useEffect(() => {
    resetDraftStore()
    setCurrentDraft(null)
    if (!selectedEmailId) return
    fetchDraftForEmail(selectedEmailId)
      .then((draft) => setCurrentDraft(draft))
      .catch(() => setCurrentDraft(null))
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

  const categoryMenu = useMemo<CategoryMenuItem[]>(
    () => [
      { key: "all", label: "All", icon: InboxIcon },
      ...SYSTEM_CATEGORY_MENU,
      ...customCategoriesState.map((customCategory) => ({
        key: customCategory.slug,
        label: customCategory.name,
        icon: Circle,
      })),
    ],
    [customCategoriesState]
  )

  const activeKey: string | "all" = activeCategory ?? "all"
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

  const setCategory = (key: string | "all") => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === "all") {
      params.delete("category")
    } else {
      params.set("category", key)
    }
    const query = params.toString()
    router.push(query ? `/inbox?${query}` : "/inbox")
  }

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = normalizeCustomCategoryName(newCategoryName)

    if (!normalizedName) {
      setCategoryError("Category name is required.")
      return
    }

    if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
      setCategoryError(`Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.`)
      return
    }

    const slug = toCustomCategorySlug(normalizedName)

    if (!slug) {
      setCategoryError("Category name must contain at least one letter or number.")
      return
    }

    if (
      isSystemInboxCategory(slug) ||
      customCategoriesState.some((customCategory) => customCategory.slug === slug)
    ) {
      setCategoryError("Category already exists.")
      return
    }

    setCategoryError(null)
    setIsSubmittingCategory(true)

    try {
      const result = await createCustomCategoryAction(normalizedName)

      if (!result.success || !result.category) {
        setCategoryError(result.error ?? "Unable to create category. Please try again.")
        return
      }

      const createdCategory = result.category
      setCustomCategoriesState((previous) =>
        [...previous, createdCategory].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewCategoryName("")
      setCategoryError(null)
      setIsManageCategoriesOpen(false)
    } catch {
      setCategoryError("Unable to create category. Please try again.")
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-svh w-full overflow-hidden">
        {/* Navigation sidebar */}
        <div
          data-testid="nav-sidebar"
          data-collapsed={sidebarCollapsed}
          className={cn(
            "flex shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200",
            sidebarCollapsed ? "w-[49px]" : "w-[220px]"
          )}
        >
          {/* Toggle header */}
          <div
            className={cn(
              "flex h-[49px] shrink-0 items-center border-b",
              sidebarCollapsed ? "justify-center" : "justify-end px-3"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <PanelLeft className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Primary nav: Inbox, Drafts, Sent, Trash */}
          <div className="flex flex-col gap-1 px-2 py-2">
            {PRIMARY_NAV.map((item) => (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <a
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      item.key === "inbox" && !activeCategory
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </a>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>

          {/* Separator between primary and secondary nav */}
          <Separator data-testid="nav-separator" />

          {/* Secondary nav: category filters */}
          <div className="flex flex-col gap-1 px-2 py-2">
            <Dialog
              open={isManageCategoriesOpen}
              onOpenChange={(open) => {
                setIsManageCategoriesOpen(open)
                if (!open) {
                  setCategoryError(null)
                  setNewCategoryName("")
                }
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      data-testid="manage-categories-button"
                      className="mb-1 flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Settings2 className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span>Manage Categories</span>}
                    </button>
                  </DialogTrigger>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">Manage Categories</TooltipContent>
                )}
              </Tooltip>

              <DialogContent className="sm:max-w-md" data-testid="manage-categories-dialog">
                <DialogHeader>
                  <DialogTitle>Manage Categories</DialogTitle>
                  <DialogDescription>
                    Create custom inbox categories for your personal sorting taxonomy.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-category-name">Category name</Label>
                    <Input
                      id="custom-category-name"
                      data-testid="custom-category-input"
                      value={newCategoryName}
                      onChange={(event) => setNewCategoryName(event.target.value)}
                      placeholder="e.g. VIP clients"
                      maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                      aria-invalid={Boolean(categoryError)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {normalizeCustomCategoryName(newCategoryName).length}/{MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                    </p>
                    {categoryError && (
                      <p role="alert" className="text-sm text-destructive" data-testid="custom-category-error">
                        {categoryError}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsManageCategoriesOpen(false)}
                      disabled={isSubmittingCategory}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingCategory}>
                      {isSubmittingCategory ? "Creating..." : "Create category"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {categoryMenu.map((item) => (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCategory(item.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      activeKey === item.key
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
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

              <div className="mt-3 rounded-xl border border-[#e6e6e8] bg-white p-4">
                <DraftSection
                  draft={currentDraft}
                  emailId={selectedEmailId!}
                  userId={userId}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
