// deno-lint-ignore-file no-import-prefix
// Supabase Edge Function: sync-emails
// Triggered every 5 minutes by pg_cron (migration 007).
// Fetches new emails for all active sync jobs and stores metadata only.
// NO email content is persisted (NFR8, FR33).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { triageEmail, type EmailCategory } from './triage.ts'

type DenoServe = (handler: (_req: Request) => Response | Promise<Response>) => unknown
type DenoLike = {
  env: {
    get: (name: string) => string | undefined
  }
  serve: DenoServe
}

const denoGlobal = globalThis as typeof globalThis & {
  Deno?: DenoLike
}

const denoApi = denoGlobal.Deno
if (!denoApi) {
  throw new Error('Deno runtime not available')
}
const deno = denoApi

const supabaseUrl = deno.env.get('SUPABASE_URL')!
const serviceRoleKey = deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openAiApiKey = deno.env.get('OPENAI_API_KEY') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface SyncJob {
  id: string
  user_id: string
  provider: 'gmail' | 'outlook' | 'imap'
  last_synced_at: string | null
  retry_count: number
}

interface EmailConnection {
  vault_secret_id: string
}

interface EmailMessage {
  providerEmailId: string
  subject: string | null
  fromEmail: string | null
  fromName: string | null
  receivedAt: Date
  category: EmailCategory
  priorityRank: number
}

const MAX_RETRIES = 3

async function getVaultSecret(vaultSecretId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc('read_vault_secret', { secret_id: vaultSecretId })

  if (error || !data) return null
  try {
    return JSON.parse(data as string) as Record<string, unknown>
  } catch {
    return null
  }
}

async function upsertVaultSecret(name: string, secret: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('create_vault_secret', {
    secret: JSON.stringify(secret),
    name,
  })

  if (error) {
    throw new Error(`Vault secret update failed: ${error.message}`)
  }
}

async function storeEmails(userId: string, provider: string, emails: EmailMessage[]): Promise<void> {
  if (emails.length === 0) return

  const rows = emails.map(e => ({
    user_id: userId,
    provider,
    provider_email_id: e.providerEmailId,
    subject: e.subject,
    from_email: e.fromEmail,
    from_name: e.fromName,
    received_at: e.receivedAt.toISOString(),
    category: e.category,
    priority_rank: e.priorityRank,
  }))

  await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'user_id,provider,provider_email_id', ignoreDuplicates: true })
}

async function markJobSuccess(jobId: string): Promise<void> {
  await supabase
    .from('email_sync_jobs')
    .update({
      last_synced_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function markJobError(jobId: string, error: string, currentRetryCount: number): Promise<void> {
  const newRetryCount = currentRetryCount + 1
  await supabase
    .from('email_sync_jobs')
    .update({
      retry_count: newRetryCount,
      last_error: error,
      status: newRetryCount >= MAX_RETRIES ? 'error' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function syncGmail(
  job: SyncJob,
  credentials: Record<string, unknown>,
  lastSyncedAt: Date | null
): Promise<void> {
  const access_token = credentials.access_token as string
  const refresh_token = credentials.refresh_token as string
  const after = lastSyncedAt ? Math.floor(lastSyncedAt.getTime() / 1000) : 0

  function doFetch(token: string): Promise<Response> {
    const query = after > 0 ? `?q=after:${after}` : ''
    return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  let listRes = await doFetch(access_token)
  let currentToken = access_token

  if (listRes.status === 401) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    if (!refreshRes.ok) throw new Error('Gmail token refresh failed')
    const refreshed = (await refreshRes.json()) as { access_token: string }
    currentToken = refreshed.access_token
    await upsertVaultSecret(`gmail:${job.user_id}`, { ...credentials, access_token: currentToken })
    listRes = await doFetch(currentToken)
  }

  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`)

  const listData = (await listRes.json()) as { messages?: Array<{ id: string }> }
  const messageIds = listData.messages?.map(m => m.id) ?? []

  const emails: EmailMessage[] = []
  for (const id of messageIds) {
    const metaRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${currentToken}` } }
    )
    if (!metaRes.ok) continue

    const msg = (await metaRes.json()) as {
      id: string
      payload?: { headers?: Array<{ name: string; value: string }> }
      internalDate?: string
    }
    const headers = msg.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? null
    const fromRaw = headers.find(h => h.name === 'From')?.value ?? ''
    const dateStr = headers.find(h => h.name === 'Date')?.value

    const fromMatch = fromRaw.match(/^(.*?)\s*<([^>]+)>$/)
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromRaw.trim() || null
    const fromName = fromMatch ? fromMatch[1].trim() || null : null
    const receivedAt = dateStr ? new Date(dateStr) : msg.internalDate ? new Date(Number(msg.internalDate)) : new Date()

    const triage = await triageEmail(subject, fromEmail, openAiApiKey).catch(() => ({
      category: 'other' as EmailCategory,
      priorityRank: 20,
    }))
    emails.push({ providerEmailId: msg.id, subject, fromEmail, fromName, receivedAt, category: triage.category, priorityRank: triage.priorityRank })
  }

  await storeEmails(job.user_id, 'gmail', emails)
  await markJobSuccess(job.id)
}

async function syncOutlook(
  job: SyncJob,
  credentials: Record<string, unknown>,
  lastSyncedAt: Date | null
): Promise<void> {
  const access_token = credentials.access_token as string
  const refresh_token = credentials.refresh_token as string

  // Refresh token if needed with a lightweight probe
  let currentToken = access_token
  const probe = await fetch(
    'https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=1',
    { headers: { Authorization: `Bearer ${currentToken}` } }
  )
  if (probe.status === 401) {
    const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: deno.env.get('MICROSOFT_CLIENT_ID') ?? '',
        client_secret: deno.env.get('MICROSOFT_CLIENT_SECRET') ?? '',
        refresh_token,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access',
      }),
    })
    if (!refreshRes.ok) throw new Error('Outlook token refresh failed')
    const refreshed = (await refreshRes.json()) as { access_token: string }
    currentToken = refreshed.access_token
    await upsertVaultSecret(`outlook:${job.user_id}`, { ...credentials, access_token: currentToken })
  } else if (!probe.ok) {
    throw new Error(`Outlook probe failed: ${probe.status}`)
  }

  interface GraphMsg {
    id: string
    subject?: string
    from?: { emailAddress?: { name?: string; address?: string } }
    receivedDateTime?: string
  }
  interface GraphPage {
    value?: GraphMsg[]
    '@odata.nextLink'?: string
  }

  // Fetch all Inbox messages with full pagination (Junk Email is a separate folder — excluded)
  const dateFilter = lastSyncedAt
    ? `&$filter=receivedDateTime gt ${lastSyncedAt.toISOString()}`
    : ''
  const allMessages: GraphMsg[] = []
  let nextUrl: string | null =
    `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$select=id,subject,from,receivedDateTime&$top=50${dateFilter}`

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: { Authorization: `Bearer ${currentToken}` } })
    if (!res.ok) throw new Error(`Outlook fetch failed: ${res.status}`)
    const page = (await res.json()) as GraphPage
    allMessages.push(...(page.value ?? []))
    nextUrl = page['@odata.nextLink'] ?? null
  }

  const emails: EmailMessage[] = await Promise.all(
    allMessages.map(async m => {
      const subject = m.subject ?? null
      const fromEmail = m.from?.emailAddress?.address ?? null
      const triage = await triageEmail(subject, fromEmail, openAiApiKey).catch(() => ({
        category: 'other' as EmailCategory,
        priorityRank: 20,
      }))
      return {
        providerEmailId: m.id,
        subject,
        fromEmail,
        fromName: m.from?.emailAddress?.name ?? null,
        receivedAt: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
        category: triage.category,
        priorityRank: triage.priorityRank,
      }
    })
  )

  await storeEmails(job.user_id, 'outlook', emails)
  await markJobSuccess(job.id)
}

async function syncImap(
  job: SyncJob,
  _credentials: Record<string, unknown>,
  _lastSyncedAt: Date | null
): Promise<void> {
  const reason = 'IMAP sync not supported in Edge Function runtime (todo: imap-edge)'
  console.log(`IMAP sync skipped in Edge Function for user ${job.user_id}: ${reason}`)
  await markJobError(job.id, reason, job.retry_count)
}

deno.serve(async (_req: Request) => {
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('email_sync_jobs')
      .select('id, user_id, provider, last_synced_at, retry_count')
      .eq('status', 'active')

    if (jobsError) {
      return new Response(JSON.stringify({ error: jobsError.message }), { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), { status: 200 })
    }

    const results = await Promise.allSettled(
      (jobs as SyncJob[]).map(async (job) => {
        const { data: connection } = await supabase
          .from('email_connections')
          .select('vault_secret_id')
          .match({ user_id: job.user_id, provider: job.provider })
          .single<EmailConnection>()

        if (!connection) {
          await markJobError(job.id, 'No email connection found', job.retry_count)
          return
        }

        const credentials = await getVaultSecret(connection.vault_secret_id)
        if (!credentials) {
          await markJobError(job.id, 'Failed to retrieve credentials from Vault', job.retry_count)
          return
        }

        const lastSyncedAt = job.last_synced_at ? new Date(job.last_synced_at) : null

        try {
          if (job.provider === 'gmail') {
            await syncGmail(job, credentials, lastSyncedAt)
          } else if (job.provider === 'outlook') {
            await syncOutlook(job, credentials, lastSyncedAt)
          } else {
            await syncImap(job, credentials, lastSyncedAt)
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          await markJobError(job.id, msg, job.retry_count)
        }
      })
    )

    const failed = results.filter(r => r.status === 'rejected').length
    return new Response(
      JSON.stringify({ synced: jobs.length - failed, failed }),
      { status: 200 }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
})
