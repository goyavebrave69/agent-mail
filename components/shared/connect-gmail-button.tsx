"use client"

import { connectGmailAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { useTransition } from "react"

export function ConnectGmailButton() {
  const [isPending, startTransition] = useTransition()

  const handleConnect = () => {
    startTransition(async () => {
      const result = await connectGmailAction()
      if ("url" in result) {
        window.location.href = result.url
      }
    })
  }

  return (
    <Button onClick={handleConnect} disabled={isPending} variant="outline">
      {isPending ? "Redirecting to Google..." : "Connect Gmail"}
    </Button>
  )
}
