import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { QuoteLineItem } from '@/lib/quotes/types'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emailSubject, emailBody } = await req.json() as {
    emailSubject: string
    emailBody: string
  }

  const openAiApiKey = process.env.OPENAI_API_KEY
  if (!openAiApiKey) {
    return NextResponse.json({ lineItems: fallbackItems() })
  }

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
- Regroupe logiquement les éléments (ne crée pas de doublon)
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
      console.error('[extract-quote-items] OpenAI error', response.status, text)
      return NextResponse.json({ lineItems: fallbackItems() })
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[]
    }
    const content = json.choices?.[0]?.message?.content ?? '{}'
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

    return NextResponse.json({
      lineItems: lineItems.length > 0 ? lineItems : fallbackItems(),
      clientName: raw.clientName ?? null,
    })
  } catch (err) {
    console.error('[extract-quote-items] unexpected error', err)
    return NextResponse.json({ lineItems: fallbackItems() })
  }
}

function fallbackItems(): QuoteLineItem[] {
  return [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]
}
