const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
const TRIAGE_MODEL = "gpt-4o-mini"

export interface UserCategory {
  slug: string
  name: string
  description: string | null
}

export interface TriageResult {
  category: string
  priorityRank: number
}

const FALLBACK: TriageResult = { category: "inbox", priorityRank: 0 }

function buildSystemPrompt(categories: UserCategory[]): string {
  const list = categories
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` — ${c.description}` : ""}`)
    .join("\n")

  return `You are an email classifier for a business inbox.
Classify the email into exactly one of these categories:
${list}

Respond with valid JSON only: {"category": "<slug>"}
Use the exact slug as shown. No explanation, no extra text.`
}

export async function triageEmail(
  subject: string | null,
  fromEmail: string | null,
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
          { role: "system", content: buildSystemPrompt(userCategories) },
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
    const slug = parsed.category

    if (!slug || !validSlugs.has(slug)) {
      return FALLBACK
    }

    return { category: slug, priorityRank: priorityMap.get(slug) ?? 0 }
  } catch {
    return FALLBACK
  }
}
