'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Draft } from '@/types/draft'

interface DraftRealtimeProps {
  draftId: string | null
  userId: string
  onDraftUpdate: (draft: Draft) => void
}

export function DraftRealtime({ draftId, userId, onDraftUpdate }: DraftRealtimeProps) {
  const router = useRouter()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!userId) return

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
      .channel(`drafts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drafts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return
          const updated = payload.new as Draft
          if (draftId && updated.id !== draftId) return
          onDraftUpdate(updated)
        }
      )
      .subscribe((status) => {
        if (!isMounted) return
        if (status === 'SUBSCRIBED') {
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
  }, [draftId, userId, onDraftUpdate, router])

  return null
}
