const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
const TRIAGE_MODEL = "gpt-4o-mini"

export interface UserCategory {
  slug: string
  name: string
  description: string | null
}

export type ResponseType = "text_reply" | "pdf_required"

export interface TriageResult {
  category: string
  priorityRank: number
  responseType: ResponseType
}

const FALLBACK: TriageResult = { category: "inbox", priorityRank: 0, responseType: "text_reply" }

function buildSystemPrompt(categories: UserCategory[]): string {
  const list = categories
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` — ${c.description}` : ""}`)
    .join("\n")

  return `You are an email classifier for a business inbox.

## Task 1 — Category
Classify the email into exactly one of these categories:
${list}

## Task 2 — Response type
Determine whether the email requires a commercial document (quote, estimate, price list, offer, proposal) or a plain text reply.
Set "response_type" to "pdf_required" if the sender is requesting: a quote, price, estimate, offer, proposal, devis, tarif, or any commercial document.
Set "response_type" to "text_reply" for all other emails (questions, follow-ups, invoices, support requests, etc.).

Respond with valid JSON only:
{"category": "<slug>", "response_type": "text_reply" | "pdf_required"}

Use the exact slug as shown. No explanation, no extra text.`
}

const BODY_EXCERPT_LENGTH = 300

export async function triageEmail(
  subject: string | null,
  fromEmail: string | null,
  bodyText: string | null,
  userCategories: UserCategory[],
  openAiApiKey: string
): Promise<TriageResult> {
  if (userCategories.length === 0) {
    return FALLBACK
  }

  const apiKey = openAiApiKey.trim()
  if (!apiKey) {
    return FALLBACK
  }

  const validSlugs = new Set(userCategories.map((c) => c.slug))
  const priorityMap = new Map(
    userCategories.map((c, i) => [c.slug, (userCategories.length - i) * 10])
  )

  const bodyExcerpt = bodyText?.trim().slice(0, BODY_EXCERPT_LENGTH) ?? null
  const content = [
    subject ? `Subject: ${subject}` : null,
    fromEmail ? `From: ${fromEmail}` : null,
    bodyExcerpt ? `Body: ${bodyExcerpt}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TRIAGE_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(userCategories) },
          { role: "user", content: content || "No subject or sender" },
        ],
        temperature: 0,
        max_tokens: 64,
      }),
    })

    if (!response.ok) {
      return FALLBACK
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[]
    }

    const raw = json.choices?.[0]?.message?.content ?? ""
    const parsed = JSON.parse(raw) as { category?: string; response_type?: string }
    const slug = parsed.category

    if (!slug || !validSlugs.has(slug)) {
      return FALLBACK
    }

    const responseType: ResponseType =
      parsed.response_type === "pdf_required" ? "pdf_required" : "text_reply"

    return { category: slug, priorityRank: priorityMap.get(slug) ?? 0, responseType }
  } catch {
    return FALLBACK
  }
}
