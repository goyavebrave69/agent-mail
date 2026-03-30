const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
const EMBEDDING_MODEL = "text-embedding-ada-002"

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`OpenAI embeddings API error ${response.status}: ${body}`)
  }

  const json = (await response.json()) as { data: { embedding: number[] }[] }
  return json.data[0].embedding
}
