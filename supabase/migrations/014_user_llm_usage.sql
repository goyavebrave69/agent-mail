-- Migration 014: user_llm_usage table for LLM quota tracking
-- Tracks daily LLM call count per user; resets after 24 hours

CREATE TABLE IF NOT EXISTS public.user_llm_usage (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  call_count  INTEGER NOT NULL DEFAULT 0,
  reset_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
