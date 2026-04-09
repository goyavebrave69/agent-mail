import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  console.log('[extract-quote-items] subject:', JSON.stringify(emailSubject))
  console.log('[extract-quote-items] body preview:', JSON.stringify(emailBody.slice(0, 200)))

  // ── API key ───────────────────────────────────────────────────────────────
  const openAiApiKey = process.env.OPENAI_API_KEY
  if (!openAiApiKey) {
    console.error('[extract-quote-items] ❌ OPENAI_API_KEY is missing from env')
    return NextResponse.json({ lineItems: fallbackItems(), debug: 'no-api-key' })
  }
  console.log('[extract-quote-items] ✅ API key present, calling OpenAI...')

  const systemPrompt = `Tu es un assistant qui analyse des emails de demande de devis.
À partir du contenu de l'email, extrais les prestations ou produits demandés par le client.

Réponds UNIQUEMENT avec un objet JSON valide de cette forme :
{
  "clientName": "prénom ou nom du client si identifiable, sinon null",
  "lineItems": [
    {
      "description": "description précise de la prestation ou du produit",
      "quantity": 1,
      "unitPrice": 0
    }
  ]
}

Règles :
- Si le client mentionne une quantité, utilise-la ; sinon mets 1
- Si le client mentionne un prix, utilise-le ; sinon mets 0
- Si rien de précis n'est demandé, crée une ligne générique décrivant la prestation principale implicite
- Ne mets jamais plus de 10 lignes
- Descriptions en français`

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
    console.log('[extract-quote-items] ✅ OpenAI raw response:', content.slice(0, 300))

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

    console.log('[extract-quote-items] ✅ extracted', lineItems.length, 'line items')

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
