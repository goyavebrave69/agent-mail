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
    console.log('[extract-quote-items] subject:', JSON.stringify(emailSubject))
  console.log('[extract-quote-items] body preview:', JSON.stringify(emailBody.slice(0, 300)))
  console.log('[extract-quote-items] KB chunks found:', kbChunks.length)
  } catch (e) {
    console.warn('[extract-quote-items] KB search failed (continuing without):', e)
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const kbSection = kbChunks.length > 0
    ? `\n\n=== Catalogue de référence (prix) ===\n${kbChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}\n=== Fin du catalogue ===`
    : ''

  const systemPrompt = `Tu es un assistant qui extrait des lignes de devis depuis un email client.

PRIORITÉ ABSOLUE : le contenu de l'email prime toujours. Lis l'email avec attention et extrais exactement ce que le client demande.
${kbSection}

RÈGLE : tu dois TOUJOURS retourner au moins une ligne dans "lineItems", jamais un tableau vide.

Stratégie (dans l'ordre de priorité) :
1. Le client liste des produits/prestations avec ou sans quantités → crée une ligne par élément cité
2. Complète les prix unitaires manquants grâce au catalogue si les produits correspondent
3. Si la demande est vague → une ligne déduite du contexte de l'email

Format JSON strict :
{
  "clientName": "nom/prénom du client si présent dans l'email, sinon null",
  "lineItems": [
    { "description": "libellé exact repris de l'email", "quantity": 1, "unitPrice": 0 }
  ]
}

- Quantité : utilise l'unité mentionnée (m², unités, jours…), sinon 1
- Prix : utilise le catalogue si correspondance, sinon 0
- Maximum 10 lignes, descriptions en français`

  const userMessage = `=== Email client ===\nObjet : ${emailSubject}\n\n${emailBody.slice(0, 3000)}`

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
