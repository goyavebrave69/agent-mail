const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
const EMBEDDING_MODEL = "text-embedding-ada-002"

interface SupabaseRpcClient {
  rpc: (
    fn: string,
    params: Record<string, unknown>
  ) => Promise<{
    data: Array<{ content: string; similarity: number }> | null
    error: { message: string } | null
  }>
}

export async function findRelevantKbChunks(
  queryEmbedding: number[],
  userId: string,
  supabase: SupabaseRpcClient,
  options?: {
    limit?: number
    minSimilarity?: number
  }
): Promise<Array<{ content: string; similarity: number }>> {
  const limit = options?.limit ?? 5
  const minSimilarity = options?.minSimilarity ?? 0.7

  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: minSimilarity,
    match_count: limit,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(`findRelevantKbChunks RPC failed: ${error.message}`)
  }

  return data ?? []
}

export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY is not configured")

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
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
