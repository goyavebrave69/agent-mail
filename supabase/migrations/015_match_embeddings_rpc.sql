-- Migration 015: match_embeddings RPC for KB similarity search
-- Called by generate-draft Edge Function with service_role key

CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE(
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE e.user_id = p_user_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Only service_role can execute
REVOKE EXECUTE ON FUNCTION public.match_embeddings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_embeddings TO service_role;
