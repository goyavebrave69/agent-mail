'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { disconnectMailboxAction } from '@/app/(app)/settings/actions'

interface DisconnectMailboxButtonProps {
  provider: 'gmail' | 'outlook' | 'imap'
}

export function DisconnectMailboxButton({ provider }: DisconnectMailboxButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDisconnect() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await disconnectMailboxAction({ provider })
        if ('error' in result) {
          setError('Failed to disconnect. Please try again.')
          setConfirming(false)
        } else {
          router.refresh()
        }
      } catch {
        setError('Failed to disconnect. Please try again.')
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm text-muted-foreground">Are you sure? This will remove access to your mailbox.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isPending}
          >
            {isPending ? 'Disconnecting…' : 'Confirm'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={isPending}
      >
        Disconnect
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
