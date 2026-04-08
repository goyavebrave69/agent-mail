-- Migration 020: add optional description to custom_categories

ALTER TABLE public.custom_categories
  ADD COLUMN description TEXT DEFAULT NULL
  CONSTRAINT custom_categories_description_length
    CHECK (char_length(description) <= 200);
