"use client"

import { deleteAccountAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState, useTransition } from "react"

export function DeleteAccountButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccountAction()
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending}>
            {isPending ? "Deleting account..." : "Delete my account"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data will
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
