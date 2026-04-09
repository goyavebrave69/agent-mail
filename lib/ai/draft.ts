const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const DRAFT_MODEL = 'gpt-4o-mini'

export interface DraftGenerationResult {
  content: string
  confidenceScore: number
}

export interface DraftGenerationError {
  error: string
  retryable: boolean
}

const MAX_BODY_CHARS = 4000

function buildSystemPrompt(userProfile: string | null, hasKbContext: boolean): string {
  const sections: string[] = []

  sections.push(`# Rôle
Tu es l'assistant email professionnel de l'utilisateur.
Tu rédiges des réponses d'email en français uniquement, même si l'email reçu est dans une autre langue.`)

  if (userProfile?.trim()) {
    sections.push(`# Contexte métier
${userProfile.trim()}`)
  }

  if (hasKbContext) {
    sections.push(`# Base de connaissances
Des extraits de la base de connaissances de l'utilisateur sont fournis ci-après.
Utilise ces informations pour personnaliser la réponse si elles sont pertinentes.
Ne les invente pas — utilise uniquement ce qui est fourni.`)
  }

  sections.push(`# Format de réponse OBLIGATOIRE

Ta réponse doit TOUJOURS respecter ce gabarit exact, sans exception :

[salutation]

[remerciement ou accusé de réception si pertinent]

[corps de la réponse]

[formule de politesse]

Règles pour chaque partie :
- [salutation] : "Bonjour [Prénom]," si le prénom est identifiable dans l'email, sinon "Bonjour," — JAMAIS omettre cette ligne
- [remerciement] : inclure si l'expéditeur a fait une demande, envoyé un document, ou initié un contact. Ex : "Merci pour votre message." / "Merci de votre retour."
- [corps] : réponds précisément à la demande. Sépare les idées par des lignes vides. Ne commence pas par "Je".
- [formule de politesse] : TOUJOURS terminer par "Cordialement," ou "Bien cordialement," sur sa propre ligne — c'est non négociable

Contraintes globales :
- Français exclusivement, même si l'email reçu est dans une autre langue
- Ton professionnel et cordial
- Pas d'objet, pas de signature (nom/coordonnées)
- N'invente aucune information non présente dans l'email ou la base de connaissances`)

  return sections.join('\n\n')
}

function buildUserMessage(
  emailSubject: string | null,
  emailFrom: string | null,
  emailBody: string | null,
  kbChunks: Array<{ content: string; similarity: number }>,
  instruction: string | null | undefined
): string {
  const parts: string[] = []

  if (kbChunks.length > 0) {
    parts.push('=== Base de connaissances ===')
    kbChunks.forEach((c, i) => {
      parts.push(`[${i + 1}] (similarité: ${c.similarity.toFixed(2)})\n${c.content}`)
    })
    parts.push('')
  }

  parts.push('=== Email reçu ===')
  if (emailFrom) parts.push(`De : ${emailFrom}`)
  if (emailSubject) parts.push(`Objet : ${emailSubject}`)
  if (emailBody) {
    parts.push('')
    parts.push(emailBody.trim().slice(0, MAX_BODY_CHARS))
  }

  if (instruction) {
    parts.push('')
    parts.push('=== Instruction spécifique ===')
    parts.push(instruction)
  }

  parts.push('')
  parts.push('Rédige une réponse à cet email.')

  return parts.join('\n')
}

function calculateConfidenceScore(
  kbChunks: Array<{ content: string; similarity: number }>,
  emailSubject: string | null,
  emailBody: string | null
): number {
  // Base score: 40 — the LLM always has at least the email to work with
  let score = 40

  // Add up to 20 points if email body is present and non-trivial
  const bodyLength = emailBody?.trim().length ?? 0
  if (bodyLength >= 50) {
    score += 20
  } else if (bodyLength > 0) {
    score += 10
  }

  // Add up to 25 points based on average KB chunk similarity (optional enrichment)
  if (kbChunks.length > 0) {
    const avgSimilarity = kbChunks.reduce((sum, c) => sum + c.similarity, 0) / kbChunks.length
    score += Math.round(avgSimilarity * 25)
  }

  // Add up to 15 points based on subject clarity
  if (emailSubject && emailSubject.trim().length >= 10) {
    score += 15
  } else if (emailSubject && emailSubject.trim().length > 0) {
    score += 7
  }

  // Cap at 0–100
  return Math.min(100, Math.max(0, score))
}

export async function generateDraft(
  emailSubject: string | null,
  emailFrom: string | null,
  emailBody: string | null,
  kbChunks: Array<{ content: string; similarity: number }>,
  openAiApiKey: string,
  options?: {
    userProfile?: string | null
    instruction?: string | null
  }
): Promise<DraftGenerationResult | DraftGenerationError> {
  const userProfile = options?.userProfile ?? null
  const instruction = options?.instruction ?? null

  const systemPrompt = buildSystemPrompt(userProfile, kbChunks.length > 0)
  const userMessage = buildUserMessage(emailSubject, emailFrom, emailBody, kbChunks, instruction)

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: DRAFT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      if (response.status === 429) {
        return { error: `LLM quota exceeded: ${body}`, retryable: false }
      }
      if (response.status >= 500) {
        return { error: `OpenAI server error ${response.status}: ${body}`, retryable: true }
      }
      return { error: `OpenAI API error ${response.status}: ${body}`, retryable: false }
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[]
    }

    const content = json.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) {
      return { error: 'LLM returned empty content', retryable: true }
    }

    const confidenceScore = calculateConfidenceScore(kbChunks, emailSubject, emailBody)

    return { content: content.trim(), confidenceScore }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Network error: ${message}`, retryable: true }
  }
}
