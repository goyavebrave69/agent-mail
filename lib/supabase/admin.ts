import { createClient } from "@supabase/supabase-js"

/**
 * Admin client using the service role key.
 * ONLY import this from Server Actions or Route Handlers.
 * NEVER import from Client Components — the service role key bypasses RLS.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
