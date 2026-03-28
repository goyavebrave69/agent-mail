"use client"

import { logoutAction } from "@/app/(auth)/logout/actions"
import { Button } from "@/components/ui/button"
import { useState, useTransition } from "react"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    setError(null)
    startTransition(async () => {
      const result = await logoutAction()
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isPending}
      >
        {isPending ? "Logging out..." : "Log out"}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
