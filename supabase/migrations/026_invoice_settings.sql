-- Migration 026: Invoice settings for quote generation
-- Stores per-user business info used to generate PDF quotes

CREATE TABLE public.invoice_settings (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode             TEXT NOT NULL DEFAULT 'auto'
                     CHECK (mode IN ('auto', 'template')),
  business_name    TEXT,
  address          TEXT,
  siret            TEXT,
  vat_number       TEXT,
  logo_url         TEXT,
  payment_terms    TEXT DEFAULT '30 jours net',
  currency         TEXT NOT NULL DEFAULT 'EUR',
  tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  template_file_url TEXT,
  last_quote_sequence INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON public.invoice_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
