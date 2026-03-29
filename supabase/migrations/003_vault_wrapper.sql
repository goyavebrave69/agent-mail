-- Public wrapper for vault secret upsert — callable via supabase-js rpc()
-- Creates a new secret or replaces the existing one with the same name.
-- Only accessible with service role key.
CREATE OR REPLACE FUNCTION public.create_vault_secret(
  secret text,
  name   text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  existing_id uuid;
  result_id   uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE secrets.name = create_vault_secret.name;

  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, secret, name);
    RETURN existing_id;
  ELSE
    SELECT vault.create_secret(secret, name) INTO result_id;
    RETURN result_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_vault_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vault_secret(text, text) TO service_role;
