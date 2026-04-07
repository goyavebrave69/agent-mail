'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  BookOpen,
  Circle,
  FileText,
  Inbox as InboxIcon,
  MessageSquare,
  PanelLeft,
  Receipt,
  Reply,
  Settings,
  Settings2,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createCustomCategoryAction } from '@/app/(app)/inbox/actions'
import {
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  isSystemInboxCategory,
  normalizeCustomCategoryName,
  toCustomCategorySlug,
  type CustomCategory,
} from '@/lib/inbox/custom-categories'
import { CATEGORY_BADGE } from '@/components/inbox/inbox-list'

const SESSION_KEY = 'app_sidebar_collapsed'

type PrimaryNavItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  { key: 'inbox', label: 'Inbox', icon: InboxIcon, href: '/inbox' },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, href: '/knowledge-base' },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

type CategoryMenuItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SYSTEM_CATEGORY_MENU: CategoryMenuItem[] = [
  { key: 'quote', label: CATEGORY_BADGE.quote.label, icon: FileText },
  { key: 'inquiry', label: CATEGORY_BADGE.inquiry.label, icon: MessageSquare },
  { key: 'invoice', label: CATEGORY_BADGE.invoice.label, icon: Receipt },
  { key: 'follow_up', label: CATEGORY_BADGE.follow_up.label, icon: Reply },
  { key: 'spam', label: CATEGORY_BADGE.spam.label, icon: ShieldAlert },
  { key: 'other', label: CATEGORY_BADGE.other.label, icon: Circle },
]

interface AppSidebarProps {
  customCategories: CustomCategory[]
}

export function AppSidebar({ customCategories: initialCategories }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })

  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(initialCategories)
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    sessionStorage.setItem(SESSION_KEY, String(next))
  }

  const isInboxRoute = pathname === '/inbox' || pathname.startsWith('/inbox/')

  const activeCategory = searchParams.get('category')
  const activeKey: string = activeCategory ?? 'all'

  const setCategory = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'all') {
      params.delete('category')
    } else {
      params.set('category', key)
    }
    const query = params.toString()
    router.push(query ? `/inbox?${query}` : '/inbox')
  }

  const categoryMenu: CategoryMenuItem[] = [
    { key: 'all', label: 'All', icon: InboxIcon },
    ...SYSTEM_CATEGORY_MENU,
    ...customCategories.map((cat) => ({
      key: cat.slug,
      label: cat.name,
      icon: Circle,
    })),
  ]

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = normalizeCustomCategoryName(newCategoryName)
    if (!normalizedName) {
      setCategoryError('Category name is required.')
      return
    }
    if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
      setCategoryError(`Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.`)
      return
    }
    const slug = toCustomCategorySlug(normalizedName)
    if (!slug) {
      setCategoryError('Category name must contain at least one letter or number.')
      return
    }
    if (isSystemInboxCategory(slug) || customCategories.some((c) => c.slug === slug)) {
      setCategoryError('Category already exists.')
      return
    }

    setCategoryError(null)
    setIsSubmittingCategory(true)
    try {
      const result = await createCustomCategoryAction(normalizedName)
      if (!result.success || !result.category) {
        setCategoryError(result.error ?? 'Unable to create category. Please try again.')
        return
      }
      setCustomCategories((prev) =>
        [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewCategoryName('')
      setCategoryError(null)
      setIsManageCategoriesOpen(false)
    } catch {
      setCategoryError('Unable to create category. Please try again.')
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-testid="app-sidebar"
        data-collapsed={collapsed}
        className={cn(
          'flex shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200',
          collapsed ? 'w-[49px]' : 'w-[220px]'
        )}
      >
        {/* Toggle */}
        <div
          className={cn(
            'flex h-[49px] shrink-0 items-center border-b',
            collapsed ? 'justify-center' : 'justify-end px-3'
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <PanelLeft className="h-4 w-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand' : 'Collapse'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Primary nav */}
        <div className="flex flex-col gap-1 px-2 py-2">
          {PRIMARY_NAV.map((item) => {
            const isActive =
              item.key === 'inbox'
                ? pathname === '/inbox' || pathname.startsWith('/inbox/')
                : pathname.startsWith(`/${item.key}`)
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>

        {/* Category filters — inbox only */}
        {isInboxRoute && (
          <>
            <Separator data-testid="nav-separator" />
            <div className="flex flex-col gap-1 px-2 py-2">
              <Dialog
                open={isManageCategoriesOpen}
                onOpenChange={(open) => {
                  setIsManageCategoriesOpen(open)
                  if (!open) {
                    setCategoryError(null)
                    setNewCategoryName('')
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
                        {!collapsed && <span>Manage Categories</span>}
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  {collapsed && (
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
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. VIP clients"
                        maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                        aria-invalid={Boolean(categoryError)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {normalizeCustomCategoryName(newCategoryName).length}/
                        {MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                      </p>
                      {categoryError && (
                        <p
                          role="alert"
                          className="text-sm text-destructive"
                          data-testid="custom-category-error"
                        >
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
                        {isSubmittingCategory ? 'Creating...' : 'Create category'}
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
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        activeKey === item.key
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : ''
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
