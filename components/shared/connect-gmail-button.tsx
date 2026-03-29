"use client"

import { connectGmailAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { useState, useTransition } from "react"

export function ConnectGmailButton() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConnect = () => {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await connectGmailAction()
      if ("url" in result) {
        window.location.href = result.url
        return
      }

      setErrorMessage(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleConnect} disabled={isPending} variant="outline">
        {isPending ? "Redirecting to Google..." : "Connect Gmail"}
      </Button>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  )
}
