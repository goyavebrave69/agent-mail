// deno-lint-ignore-file no-import-prefix
// Supabase Edge Function: index-kb
// Triggered via HTTP POST after a KB file is uploaded (story 3.1).
// Parses CSV/Excel content, generates embeddings, and stores them in the
// embeddings table. Updates kb_files.status to 'ready' or 'error'.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Papa from 'npm:papaparse@5.4.1'
import * as XLSX from 'npm:xlsx@0.18.5'

type DenoServe = (handler: (_req: Request) => Response | Promise<Response>) => unknown
type DenoLike = {
  env: { get: (name: string) => string | undefined }
  serve: DenoServe
}

const denoGlobal = globalThis as typeof globalThis & { Deno?: DenoLike }
const denoApi = denoGlobal.Deno
if (!denoApi) throw new Error('Deno runtime not available')
const deno = denoApi

const supabaseUrl = deno.env.get('SUPABASE_URL')!
const serviceRoleKey = deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openAiApiKey = deno.env.get('OPENAI_API_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({ model: 'text-embedding-ada-002', input: text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI embeddings API error ${res.status}: ${body}`)
  }
  const json = await res.json() as { data: { embedding: number[] }[] }
  return json.data[0].embedding
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

function chunkRows(rows: Record<string, unknown>[], chunkSize = 20): string[] {
  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    const text = slice
      .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', '))
      .join('\n')
    if (text.trim()) chunks.push(text)
  }
  return chunks
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseFile(filename: string, buffer: ArrayBuffer): string[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'csv') {
    const text = new TextDecoder().decode(buffer)
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (result.errors.length > 0) {
      const firstError = result.errors[0]
      const rowInfo = typeof firstError.row === 'number' ? ` at row ${firstError.row}` : ''
      throw new Error(`CSV parse failed${rowInfo}: ${firstError.message}`)
    }

    return chunkRows(result.data as Record<string, unknown>[])
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName]
    )
    return chunkRows(rows)
  }

  throw new Error(`Unsupported file extension: .${ext}`)
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

async function markReady(kbFileId: string): Promise<void> {
  await supabase
    .from('kb_files')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', kbFileId)
}

async function markError(kbFileId: string, message: string): Promise<void> {
  await supabase
    .from('kb_files')
    .update({
      status: 'error',
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kbFileId)
}

async function cleanupEmbeddings(kbFileId: string): Promise<void> {
  await supabase.from('embeddings').delete().eq('kb_file_id', kbFileId)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('authorization')
  const expectedAuthHeader = `Bearer ${serviceRoleKey}`
  if (authHeader !== expectedAuthHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let kbFileId: string
  try {
    const body = await req.json() as { kb_file_id?: string }
    if (!body.kb_file_id) throw new Error('Missing kb_file_id in request body')
    kbFileId = body.kb_file_id
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 400 })
  }

  // Fetch the kb_files row
  const { data: kbFile, error: fetchError } = await supabase
    .from('kb_files')
    .select('id, user_id, filename, storage_path, status')
    .eq('id', kbFileId)
    .single()

  if (fetchError || !kbFile) {
    return new Response(JSON.stringify({ error: 'kb_file not found' }), { status: 404 })
  }

  if (kbFile.status !== 'pending') {
    return new Response(
      JSON.stringify({ error: `kb_file status is '${kbFile.status}', expected 'pending'` }),
      { status: 409 }
    )
  }

  try {
    // Download from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('knowledge-base')
      .download(kbFile.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message ?? 'unknown'}`)
    }

    const buffer = await fileData.arrayBuffer()
    const chunks = parseFile(kbFile.filename, buffer)

    if (chunks.length === 0) {
      throw new Error('File parsed but contained no data rows')
    }

    // Generate embeddings and insert
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk)
      const { error: insertError } = await supabase.from('embeddings').insert({
        user_id: kbFile.user_id,
        kb_file_id: kbFileId,
        content: chunk,
        embedding,
      })
      if (insertError) throw new Error(`Embedding insert failed: ${insertError.message}`)
    }

    await markReady(kbFileId)
    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), { status: 200 })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await cleanupEmbeddings(kbFileId)
    await markError(kbFileId, message)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
