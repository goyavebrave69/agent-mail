"use client"

import { connectOutlookAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { useTransition } from "react"

export function ConnectOutlookButton() {
  const [isPending, startTransition] = useTransition()

  const handleConnect = () => {
    startTransition(async () => {
      const result = await connectOutlookAction()
      if ("url" in result) {
        window.location.href = result.url
      }
    })
  }

  return (
    <Button onClick={handleConnect} disabled={isPending} variant="outline">
      {isPending ? "Redirecting to Microsoft..." : "Connect Outlook"}
    </Button>
  )
}
