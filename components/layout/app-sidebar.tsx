'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  BookOpen,
  Circle,
  GripVertical,
  Inbox as InboxIcon,
  PanelLeft,
  Pencil,
  Plus,
  Settings,
  Settings2,
  Trash2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createCustomCategoryAction,
  renameCustomCategoryAction,
  updateCustomCategoryAction,
  deleteCustomCategoryAction,
  reorderCustomCategoriesAction,
} from '@/app/(app)/inbox/actions'
import {
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  normalizeCustomCategoryName,
  toCustomCategorySlug,
  type CustomCategory,
} from '@/lib/inbox/custom-categories'

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

interface AppSidebarProps {
  customCategories: CustomCategory[]
}

// ─── Sortable category row ────────────────────────────────────────────────────

interface SortableCategoryItemProps {
  category: CustomCategory
  isActive: boolean
  collapsed: boolean
  renamingId: string | null
  renameValue: string
  onSelect: (slug: string) => void
  onRenameStart: (id: string, name: string) => void
  onRenameChange: (value: string) => void
  onRenameCommit: (id: string) => void
  onRenameCancel: () => void
  onEditRequest: (category: CustomCategory) => void
  onDeleteRequest: (id: string, name: string) => void
}

function SortableCategoryItem({
  category,
  isActive,
  collapsed,
  renamingId,
  renameValue,
  onSelect,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onEditRequest,
  onDeleteRequest,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const inputRef = useRef<HTMLInputElement>(null)
  const isRenaming = renamingId === category.id

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus()
  }, [isRenaming])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'group flex items-center gap-1 rounded-md text-sm text-sidebar-foreground',
            isActive && !isRenaming ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
          )}
        >
          {/* Drag handle — only visible on hover when not collapsed */}
          {!collapsed && (
            <button
              type="button"
              className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded opacity-0 group-hover:opacity-50 active:cursor-grabbing"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}

          {isRenaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={() => onRenameCommit(category.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCommit(category.id)
                if (e.key === 'Escape') onRenameCancel()
              }}
              maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
              className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelect(category.slug)}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed ? 'justify-center' : ''
              )}
            >
              <Circle className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{category.name}</span>}
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onRenameStart(category.id, category.name)}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onEditRequest(category)}>
          <Settings2 className="mr-2 h-4 w-4" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => onDeleteRequest(category.id, category.name)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function AppSidebar({ customCategories: initialCategories }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })

  const [categories, setCategories] = useState<CustomCategory[]>(initialCategories)

  // ── Add category dialog ──
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)

  // ── Edit category dialog ──
  const [editTarget, setEditTarget] = useState<CustomCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // ── Inline rename ──
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // ── DnD ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)
    setCategories(reordered)
    reorderCustomCategoriesAction(reordered.map((c) => c.id))
  }

  // ── Add category ──
  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = normalizeCustomCategoryName(newCategoryName)
    if (!normalizedName) { setCategoryError('Category name is required.'); return }
    if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
      setCategoryError(`Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.`)
      return
    }
    const slug = toCustomCategorySlug(normalizedName)
    if (!slug) { setCategoryError('Category name must contain at least one letter or number.'); return }
    if (categories.some((c) => c.slug === slug)) {
      setCategoryError('Category already exists.')
      return
    }
    setCategoryError(null)
    setIsSubmittingCategory(true)
    try {
      const result = await createCustomCategoryAction(normalizedName, newCategoryDescription || undefined)
      if (!result.success || !result.category) {
        setCategoryError(result.error ?? 'Unable to create category. Please try again.')
        return
      }
      setCategories((prev) => [...prev, result.category!])
      setNewCategoryName('')
      setNewCategoryDescription('')
      setCategoryError(null)
      setIsAddOpen(false)
    } catch {
      setCategoryError('Unable to create category. Please try again.')
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  // ── Edit category ──
  const handleEditRequest = (category: CustomCategory) => {
    setEditTarget(category)
    setEditName(category.name)
    setEditDescription(category.description ?? '')
    setEditError(null)
  }

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editTarget) return
    const normalizedName = normalizeCustomCategoryName(editName)
    if (!normalizedName) { setEditError('Category name is required.'); return }
    if (normalizedName.length > MAX_CUSTOM_CATEGORY_NAME_LENGTH) {
      setEditError(`Category name must be ${MAX_CUSTOM_CATEGORY_NAME_LENGTH} characters or fewer.`)
      return
    }
    const slug = toCustomCategorySlug(normalizedName)
    if (!slug) { setEditError('Category name must contain at least one letter or number.'); return }
    setEditError(null)
    setIsSubmittingEdit(true)
    try {
      const result = await updateCustomCategoryAction(editTarget.id, normalizedName, editDescription || undefined)
      if (!result.success) {
        setEditError(result.error ?? 'Unable to update category. Please try again.')
        return
      }
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? { ...c, name: normalizedName, slug, description: editDescription || null }
            : c
        )
      )
      setEditTarget(null)
    } catch {
      setEditError('Unable to update category. Please try again.')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // ── Rename ──
  const handleRenameStart = (id: string, name: string) => {
    setRenamingId(id)
    setRenameValue(name)
  }

  const handleRenameCommit = async (id: string) => {
    const normalized = normalizeCustomCategoryName(renameValue)
    if (!normalized) { setRenamingId(null); return }
    setRenamingId(null)
    const result = await renameCustomCategoryAction(id, normalized)
    if (result.success) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name: normalized, slug: toCustomCategorySlug(normalized) } : c
        )
      )
    }
  }

  const handleRenameCancel = () => { setRenamingId(null) }

  // ── Delete ──
  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteTarget({ id, name })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await deleteCustomCategoryAction(deleteTarget.id)
    setIsDeleting(false)
    if (result.success) {
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
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
            <div className="flex flex-col gap-0.5 px-2 py-2">
              {/* Manage / Add row */}
              <div className={cn('mb-1 flex items-center gap-1', collapsed ? 'justify-center' : 'justify-between')}>
                {!collapsed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid="manage-categories-button"
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <Settings2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Manage Categories</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Manage Categories</TooltipContent>
                  </Tooltip>
                )}
                {collapsed && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid="manage-categories-button"
                        onClick={() => setIsAddOpen(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Add Category</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* All */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      activeKey === 'all' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '',
                      collapsed ? 'justify-center' : ''
                    )}
                  >
                    <InboxIcon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>All</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">All</TooltipContent>}
              </Tooltip>

              {/* Sortable custom categories */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      isActive={activeKey === category.slug}
                      collapsed={collapsed}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      onSelect={setCategory}
                      onRenameStart={handleRenameStart}
                      onRenameChange={setRenameValue}
                      onRenameCommit={handleRenameCommit}
                      onRenameCancel={handleRenameCancel}
                      onEditRequest={handleEditRequest}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}
      </div>

      {/* Add category dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) { setCategoryError(null); setNewCategoryName(''); setNewCategoryDescription('') }
        }}
      >
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
            <div className="space-y-2">
              <Label htmlFor="custom-category-description">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="custom-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Describe what kind of emails belong here, e.g. 'Emails from key clients requiring urgent attention'"
                maxLength={200}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">{newCategoryDescription.length}/200</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
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

      {/* Edit category dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditError(null) } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the name and description for this category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category name</Label>
              <Input
                id="edit-category-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                aria-invalid={Boolean(editError)}
              />
              <p className="text-xs text-muted-foreground">
                {normalizeCustomCategoryName(editName).length}/{MAX_CUSTOM_CATEGORY_NAME_LENGTH}
              </p>
              {editError && (
                <p role="alert" className="text-sm text-destructive">{editError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-description">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="edit-category-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe what kind of emails belong here"
                maxLength={200}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">{editDescription.length}/200</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be permanently removed. Emails assigned to it will no longer be grouped under this label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
