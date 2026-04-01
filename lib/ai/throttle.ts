const DAILY_LLM_QUOTA = 100

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
}

interface SupabaseClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<{ call_count: number; reset_at: string }> | null
        error: { message: string } | null
      }>
    }
    upsert: (row: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{
      error: { message: string } | null
    }>
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  }
}

export async function checkUserLlmQuota(
  userId: string,
  supabase: SupabaseClient
): Promise<QuotaCheckResult> {
  const { data, error } = await supabase
    .from('user_llm_usage')
    .select('call_count, reset_at')
    .eq('user_id', userId)

  if (error) {
    // On DB error, allow the call (fail open) but log
    console.error('checkUserLlmQuota: DB error', error.message)
    return { allowed: true }
  }

  const now = new Date()
  const row = data?.[0]

  if (!row) {
    // First call for this user — create the row
    await supabase.from('user_llm_usage').upsert(
      { user_id: userId, call_count: 0, reset_at: now.toISOString() },
      { onConflict: 'user_id' }
    )
    return { allowed: true }
  }

  const resetAt = new Date(row.reset_at)
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceReset >= 24) {
    // Reset counter
    await supabase
      .from('user_llm_usage')
      .update({ call_count: 0, reset_at: now.toISOString() })
      .eq('user_id', userId)
    return { allowed: true }
  }

  if (row.call_count >= DAILY_LLM_QUOTA) {
    return {
      allowed: false,
      reason: `Daily LLM quota exceeded (${DAILY_LLM_QUOTA} calls/day)`,
    }
  }

  return { allowed: true }
}

export async function incrementUserLlmUsage(
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data } = await supabase
    .from('user_llm_usage')
    .select('call_count, reset_at')
    .eq('user_id', userId)

  const row = data?.[0]
  const newCount = row ? row.call_count + 1 : 1
  const resetAt = row ? row.reset_at : new Date().toISOString()

  await supabase.from('user_llm_usage').upsert(
    { user_id: userId, call_count: newCount, reset_at: resetAt },
    { onConflict: 'user_id' }
  )
}
