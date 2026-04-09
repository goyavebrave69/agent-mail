import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import type { QuoteLineItem } from '@/lib/quotes/types'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[extract-quote-items] ❌ not authenticated')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let emailSubject = ''
  let emailBody = ''
  try {
    const body = await req.json() as { emailSubject?: string; emailBody?: string }
    emailSubject = body.emailSubject ?? ''
    emailBody = body.emailBody ?? ''
  } catch (e) {
    console.error('[extract-quote-items] ❌ failed to parse request body', e)
    return NextResponse.json({ lineItems: fallbackItems(), debug: 'body-parse-error' })
  }

  const openAiApiKey = process.env.OPENAI_API_KEY
  if (!openAiApiKey) {
    console.error('[extract-quote-items] ❌ OPENAI_API_KEY is missing from env')
    return NextResponse.json({ lineItems: fallbackItems(), debug: 'no-api-key' })
  }

  // ── RAG: embed email → search KB for relevant tarifs/prestations ──────────
  let kbChunks: Array<{ content: string; similarity: number }> = []
  try {
    const queryText = [emailSubject, emailBody.slice(0, 1000)].filter(Boolean).join(' ')
    const embedding = await generateEmbedding(queryText, openAiApiKey)
    const { data: rpcData } = await supabase.rpc('match_embeddings', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 8,
      p_user_id: user.id,
    })
    kbChunks = (rpcData as Array<{ content: string; similarity: number }> | null) ?? []
    console.log('[extract-quote-items] KB chunks found:', kbChunks.length)
  } catch (e) {
    console.warn('[extract-quote-items] KB search failed (continuing without):', e)
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const kbSection = kbChunks.length > 0
    ? `\n\n=== Catalogue / tarifs ===\n${kbChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}`
    : ''

  const systemPrompt = `Tu es un assistant qui prépare des devis à partir d'emails clients.${kbSection}

Ta tâche : analyser l'email et produire des lignes de devis prêtes à envoyer.

RÈGLE ABSOLUE : tu dois TOUJOURS retourner au moins une ligne dans "lineItems". Ne retourne JAMAIS un tableau vide.

Stratégie d'extraction (dans l'ordre) :
1. Si le client cite des produits/prestations précis → crée une ligne par élément
2. Si le catalogue contient des éléments correspondant à la demande → utilise leurs descriptions et prix
3. Si la demande est vague → crée une ligne avec la prestation principale déduite du contexte (objet du mail, ton, secteur)

Format de réponse JSON strict :
{
  "clientName": "nom du client si identifiable dans l'email, sinon null",
  "lineItems": [
    { "description": "libellé professionnel de la prestation", "quantity": 1, "unitPrice": 0 }
  ]
}

Autres règles :
- Quantité : utilise ce que le client mentionne, sinon 1
- Prix unitaire : utilise le catalogue si disponible, sinon 0
- Descriptions en français, claires et professionnelles
- Maximum 10 lignes`

  const userMessage = `Objet : ${emailSubject}\n\n${emailBody.slice(0, 3000)}`

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[extract-quote-items] ❌ OpenAI HTTP error', response.status, text)
      return NextResponse.json({ lineItems: fallbackItems(), debug: `openai-${response.status}` })
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[]
    }
    const content = json.choices?.[0]?.message?.content ?? '{}'
    console.log('[extract-quote-items] ✅ OpenAI response:', content.slice(0, 400))

    const raw = JSON.parse(content) as {
      lineItems?: { description?: string; quantity?: number; unitPrice?: number }[]
      clientName?: string
    }

    const lineItems: QuoteLineItem[] = (raw.lineItems ?? []).map((item) => ({
      id: crypto.randomUUID(),
      description: item.description ?? '',
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
    }))

    console.log('[extract-quote-items] ✅ extracted', lineItems.length, 'items with KB context')

    return NextResponse.json({
      lineItems: lineItems.length > 0 ? lineItems : fallbackItems(),
      clientName: raw.clientName ?? null,
    })
  } catch (err) {
    console.error('[extract-quote-items] ❌ unexpected error', err)
    return NextResponse.json({ lineItems: fallbackItems(), debug: String(err) })
  }
}

function fallbackItems(): QuoteLineItem[] {
  return [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]
}
