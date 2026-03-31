const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
const TRIAGE_MODEL = "gpt-4o-mini"

export type EmailCategory = "quote" | "inquiry" | "invoice" | "follow_up" | "spam" | "other"

export interface TriageResult {
  category: EmailCategory
  priorityRank: number
}

const PRIORITY_MAP: Record<EmailCategory, number> = {
  quote: 100,
  invoice: 90,
  inquiry: 70,
  follow_up: 50,
  other: 20,
  spam: 0,
}

const VALID_CATEGORIES = new Set<string>([
  "quote",
  "inquiry",
  "invoice",
  "follow_up",
  "spam",
  "other",
])

const FALLBACK: TriageResult = { category: "other", priorityRank: 20 }

const SYSTEM_PROMPT = `You are an email classifier for a business inbox.
Classify the email into exactly one of these categories:
- quote: customer requesting a price quote or estimate
- invoice: billing, payment request, or invoice
- inquiry: general question or information request
- follow_up: follow-up on a previous conversation or pending item
- spam: unsolicited or irrelevant email
- other: anything that does not fit the above

Respond with valid JSON only: {"category": "<category>"}
No explanation, no extra text.`

export async function triageEmail(
  subject: string | null,
  fromEmail: string | null,
  openAiApiKey: string
): Promise<TriageResult> {
  const apiKey = openAiApiKey.trim()
  if (!apiKey) {
    return FALLBACK
  }

  const content = [
    subject ? `Subject: ${subject}` : null,
    fromEmail ? `From: ${fromEmail}` : null,
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: content || "No subject or sender" },
        ],
        temperature: 0,
        max_tokens: 32,
      }),
    })

    if (!response.ok) {
      return FALLBACK
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[]
    }

    const raw = json.choices?.[0]?.message?.content ?? ""
    const parsed = JSON.parse(raw) as { category?: string }
    const category = parsed.category

    if (!category || !VALID_CATEGORIES.has(category)) {
      return FALLBACK
    }

    const validCategory = category as EmailCategory
    return { category: validCategory, priorityRank: PRIORITY_MAP[validCategory] }
  } catch {
    return FALLBACK
  }
}
