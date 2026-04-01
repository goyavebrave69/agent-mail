// deno-lint-ignore-file no-import-prefix
// Supabase Edge Function: generate-draft
// Triggered asynchronously by sync-emails after each email is stored.
// RAG pipeline: embed email → similarity search KB → LLM draft generation.
// Status transitions: pending → generating → ready | error

import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateEmbedding, findRelevantKbChunks } from 'npm:~/lib/ai/embeddings.ts'
import { generateDraft } from 'npm:~/lib/ai/draft.ts'
import { checkUserLlmQuota, incrementUserLlmUsage } from 'npm:~/lib/ai/throttle.ts'

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

type DraftStatus = 'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'

const FALLBACK_DRAFT_CONTENT =
  'Thank you for your email. We will review and respond shortly.'
const FALLBACK_CONFIDENCE_SCORE = 20

function buildEmbeddingQueryText(args: {
  emailContent?: string | null
  subject?: string | null
  fromEmail?: string | null
}): string {
  const maxContentChars = 4000
  const clippedContent = args.emailContent?.trim().slice(0, maxContentChars) ?? ''

  return [clippedContent, args.subject?.trim() ?? '', args.fromEmail?.trim() ?? '']
    .filter(Boolean)
    .join(' ')
}

async function upsertDraftPending(emailId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('drafts')
    .upsert(
      {
        email_id: emailId,
        user_id: userId,
        status: 'pending' as DraftStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,email_id' }
    )
    .select('id')
    .single()

  if (error || !data) {
    console.error('upsertDraftPending error:', error?.message)
    return null
  }
  return (data as { id: string }).id
}

async function updateDraftStatus(
  draftId: string,
  update: {
    status: DraftStatus
    content?: string
    confidence_score?: number
    error_message?: string
    retry_count_increment?: boolean
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    status: update.status,
    updated_at: new Date().toISOString(),
  }
  if (update.content !== undefined) payload.content = update.content
  if (update.confidence_score !== undefined) payload.confidence_score = update.confidence_score
  if (update.error_message !== undefined) payload.error_message = update.error_message

  if (update.retry_count_increment) {
    // Increment retry_count via raw SQL expression not available here; use RPC-style or fetch current
    const { data, error: retryError } = await supabase
      .from('drafts')
      .select('retry_count')
      .eq('id', draftId)
      .single()

    if (retryError) {
      throw new Error(`Failed to load retry_count for draft ${draftId}: ${retryError.message}`)
    }

    const currentRetry = (data as { retry_count: number } | null)?.retry_count ?? 0
    payload.retry_count = currentRetry + 1
  }

  const { error: updateError } = await supabase.from('drafts').update(payload).eq('id', draftId)
  if (updateError) {
    throw new Error(`Failed to update draft ${draftId}: ${updateError.message}`)
  }
}

deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let emailId: string
  let userId: string
  let emailContent: string | null = null

  try {
    const body = (await req.json()) as { emailId?: string; userId?: string; emailContent?: string | null }
    if (!body.emailId || !body.userId) {
      throw new Error('Missing emailId or userId in request body')
    }
    emailId = body.emailId
    userId = body.userId
    emailContent = typeof body.emailContent === 'string' ? body.emailContent : null
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400 })
  }

  // 1. Fetch email metadata
  const { data: email, error: emailError } = await supabase
    .from('emails')
    .select('id, user_id, subject, from_email')
    .eq('id', emailId)
    .eq('user_id', userId)
    .single()

  if (emailError || !email) {
    return new Response(JSON.stringify({ error: 'Email not found' }), { status: 404 })
  }

  const emailData = email as {
    id: string
    user_id: string
    subject: string | null
    from_email: string | null
  }

  // 2. Upsert draft with pending status
  const draftId = await upsertDraftPending(emailId, userId)
  if (!draftId) {
    return new Response(JSON.stringify({ error: 'Failed to create draft record' }), { status: 500 })
  }

  // 3. Check LLM quota
  const quota = await checkUserLlmQuota(userId, supabase)
  if (!quota.allowed) {
    await updateDraftStatus(draftId, {
      status: 'error',
      error_message: quota.reason ?? 'LLM quota exceeded',
    })
    return new Response(
      JSON.stringify({ error: quota.reason ?? 'LLM quota exceeded' }),
      { status: 429 }
    )
  }

  // 4. Transition to generating
  await updateDraftStatus(draftId, { status: 'generating' })

  try {
    // 5. Generate embedding from ephemeral email content + metadata
    const queryText = buildEmbeddingQueryText({
      emailContent,
      subject: emailData.subject,
      fromEmail: emailData.from_email,
    })
    const queryEmbedding = queryText
      ? await generateEmbedding(queryText, openAiApiKey)
      : []

    // 6. Retrieve relevant KB chunks
    let kbChunks: Array<{ content: string; similarity: number }> = []
    if (queryEmbedding.length > 0) {
      kbChunks = await findRelevantKbChunks(queryEmbedding, userId, supabase)
    }

    // 7. If no KB chunks, use fallback draft
    if (kbChunks.length === 0) {
      await updateDraftStatus(draftId, {
        status: 'ready',
        content: FALLBACK_DRAFT_CONTENT,
        confidence_score: FALLBACK_CONFIDENCE_SCORE,
      })
      return new Response(
        JSON.stringify({ success: true, draftId, fallback: true }),
        { status: 200 }
      )
    }

    // 8. Call generateDraft
    const result = await generateDraft(
      emailData.subject,
      emailData.from_email,
      kbChunks,
      openAiApiKey
    )

    if ('error' in result) {
      await updateDraftStatus(draftId, {
        status: 'error',
        error_message: result.error,
        retry_count_increment: result.retryable,
      })
      return new Response(JSON.stringify({ error: result.error }), { status: 500 })
    }

    // 9. Success — update draft to ready
    await updateDraftStatus(draftId, {
      status: 'ready',
      content: result.content,
      confidence_score: result.confidenceScore,
    })

    // 10. Increment LLM usage
    await incrementUserLlmUsage(userId, supabase)

    // 11. Emit Realtime event (via Supabase broadcast)
    await supabase.channel(`drafts:${userId}`).send({
      type: 'broadcast',
      event: 'draft_ready',
      payload: { draftId, emailId },
    })

    return new Response(JSON.stringify({ success: true, draftId }), { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateDraftStatus(draftId, {
      status: 'error',
      error_message: message,
    }).catch(() => {
      // Never let status update failure propagate — NFR19
      console.error('Failed to update draft error status:', message)
    })
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
