-- Migration 028: user_settings table for per-user preferences (email signature, etc.)

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_signature TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own row
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings: owner read"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings: owner write"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings: owner update"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);
