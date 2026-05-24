"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bold,
  ChevronDown,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Send,
  Strikethrough,
  Underline,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { sendNewEmail } from "@/app/(app)/inbox/actions"
import { toast } from "sonner"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ComposeSheetProps {
  open: boolean
  onClose: () => void
  signature?: string
}

const TOOLBAR_ACTIONS = [
  { icon: Bold, cmd: "bold", label: "Gras (Ctrl+B)" },
  { icon: Italic, cmd: "italic", label: "Italique (Ctrl+I)" },
  { icon: Underline, cmd: "underline", label: "Souligné (Ctrl+U)" },
  { icon: Strikethrough, cmd: "strikeThrough", label: "Barré" },
]

const LIST_ACTIONS = [
  { icon: List, cmd: "insertUnorderedList", label: "Liste à puces" },
  { icon: ListOrdered, cmd: "insertOrderedList", label: "Liste numérotée" },
]

export function ComposeSheet({ open, onClose, signature }: ComposeSheetProps) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [toError, setToError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Inject signature when sheet opens
  useEffect(() => {
    if (!open || !editorRef.current) return
    if (signature) {
      const sep = `<br><br>-- <br>${escapeHtml(signature).replace(/\n/g, '<br>')}`
      editorRef.current.innerHTML = sep
      // Place cursor at the very start (before the separator)
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(editorRef.current, 0)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  // Run only when the sheet opens or signature changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const getBodyHtml = () => editorRef.current?.innerHTML ?? ""
  const getBodyText = () => editorRef.current?.innerText?.trim() ?? ""

  const handleClose = () => {
    resetAndClose()
  }

  const resetAndClose = () => {
    setTo("")
    setSubject("")
    setCc("")
    setBcc("")
    setShowCcBcc(false)
    setToError(null)
    if (editorRef.current) {
      editorRef.current.innerHTML = signature
        ? `<br><br>-- <br>${escapeHtml(signature).replace(/\n/g, '<br>')}`
        : ""
    }
    onClose()
  }

  // Use onMouseDown + preventDefault to prevent focus loss before execCommand
  const execFormat = (cmd: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.execCommand(cmd, false)
    editorRef.current?.focus()
  }

  const handleSend = async () => {
    setToError(null)
    const trimmedTo = to.trim()
    if (!trimmedTo) {
      setToError("Le destinataire est requis.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      setToError("Adresse email invalide.")
      return
    }
    if (!getBodyText()) {
      toast.error("Le corps du message est requis.")
      return
    }

    setIsSending(true)
    const result = await sendNewEmail({
      to: trimmedTo,
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim() || "(sans objet)",
      body: getBodyHtml(),
      isHtml: true,
    })
    setIsSending(false)

    if (result.success) {
      toast.success("Email envoyé")
      resetAndClose()
    } else {
      toast.error(result.error ?? "Échec de l'envoi. Veuillez réessayer.")
    }
  }

  return (
    <TooltipProvider delayDuration={400}>
      <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 p-0 sm:w-[560px] sm:max-w-[560px]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-base font-semibold">Nouveau message</SheetTitle>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* To */}
            <div className="border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="compose-to" className="w-10 shrink-0 text-xs text-muted-foreground">
                  À
                </Label>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    id="compose-to"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setToError(null) }}
                    placeholder="destinataire@email.com"
                    className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                    aria-describedby={toError ? "to-error" : undefined}
                  />
                  {!showCcBcc && (
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(true)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cc
                      <ChevronDown className="ml-0.5 inline h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {toError && (
                <p id="to-error" className="mt-1 pl-12 text-xs text-destructive">{toError}</p>
              )}
            </div>

            {/* Cc / Bcc */}
            {showCcBcc && (
              <>
                <div className="border-b px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="compose-cc" className="w-10 shrink-0 text-xs text-muted-foreground">
                      Cc
                    </Label>
                    <Input
                      id="compose-cc"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="copie@email.com"
                      className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="border-b px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="compose-bcc" className="w-10 shrink-0 text-xs text-muted-foreground">
                      Cci
                    </Label>
                    <Input
                      id="compose-bcc"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="copie cachée@email.com"
                      className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Subject */}
            <div className="border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="compose-subject" className="w-10 shrink-0 text-xs text-muted-foreground">
                  Objet
                </Label>
                <Input
                  id="compose-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet du message"
                  className="border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 border-b px-3 py-1.5">
              {TOOLBAR_ACTIONS.map(({ icon: Icon, cmd, label }) => (
                <Tooltip key={cmd}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onMouseDown={execFormat(cmd)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              ))}
              <div className="mx-1.5 h-4 w-px bg-border" />
              {LIST_ACTIONS.map(({ icon: Icon, cmd, label }) => (
                <Tooltip key={cmd}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onMouseDown={execFormat(cmd)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Body — contentEditable rich text area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              onClick={() => editorRef.current?.focus()}
            >
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Rédigez votre message..."
                className="min-h-[200px] text-sm outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]"
              />
            </div>
          </div>

          {/* Footer — send only, no redundant close button */}
          <div className="flex items-center border-t px-4 py-3">
            <Button onClick={handleSend} disabled={isSending} className="gap-2">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Envoi…" : "Envoyer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
