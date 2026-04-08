-- Migration 021: user profile for AI context (business description)

CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT ''
                CONSTRAINT user_profile_description_length
                  CHECK (char_length(description) <= 2000),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profile_owner ON public.user_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
