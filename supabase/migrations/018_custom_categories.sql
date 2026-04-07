-- Migration 018: user-scoped custom inbox categories

CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_categories_name_length CHECK (char_length(name) BETWEEN 1 AND 40),
  CONSTRAINT custom_categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  CONSTRAINT custom_categories_unique_slug_per_user UNIQUE (user_id, slug)
);

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_categories_select_owner ON public.custom_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY custom_categories_insert_owner ON public.custom_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY custom_categories_update_owner ON public.custom_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY custom_categories_delete_owner ON public.custom_categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_custom_categories_user_name ON public.custom_categories (user_id, name);
