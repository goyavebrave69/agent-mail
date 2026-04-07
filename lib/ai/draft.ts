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

function buildSystemPrompt(
  tone: 'formal' | 'informal',
  language: string,
  hasKbContext: boolean
): string {
  const toneDesc = tone === 'formal' ? 'professional and formal' : 'friendly and informal'
  const kbLine = hasKbContext
    ? ' When relevant, draw on the knowledge base context provided.'
    : ''
  return `You are an email assistant that writes helpful, relevant reply drafts.
Read the incoming email carefully and respond directly to what the sender is asking or requesting.${kbLine}
Write in ${language}. Use a ${toneDesc} tone.
Reply with the email body only — no subject line, no greeting header, no signature placeholder.`
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
    parts.push('=== Knowledge Base Context ===')
    kbChunks.forEach((c, i) => {
      parts.push(`[${i + 1}] (similarity: ${c.similarity.toFixed(2)})\n${c.content}`)
    })
    parts.push('')
  }

  parts.push('=== Email to Reply To ===')
  if (emailFrom) parts.push(`From: ${emailFrom}`)
  if (emailSubject) parts.push(`Subject: ${emailSubject}`)
  if (emailBody) {
    parts.push('')
    parts.push(emailBody.trim().slice(0, MAX_BODY_CHARS))
  }

  if (instruction) {
    parts.push('')
    parts.push('=== Special Instruction ===')
    parts.push(instruction)
  }

  parts.push('')
  parts.push('Write a reply draft to this email.')

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
    tone?: 'formal' | 'informal'
    language?: string
    instruction?: string | null
  }
): Promise<DraftGenerationResult | DraftGenerationError> {
  const tone = options?.tone ?? 'formal'
  const language = options?.language ?? 'English'
  const instruction = options?.instruction ?? null

  const systemPrompt = buildSystemPrompt(tone, language, kbChunks.length > 0)
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
