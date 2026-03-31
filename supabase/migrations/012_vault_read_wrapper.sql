-- Public wrapper for vault secret read — callable via supabase-js rpc()
-- Only accessible with service role key.
CREATE OR REPLACE FUNCTION public.read_vault_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  result text;
BEGIN
  SELECT decrypted_secret INTO result
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.read_vault_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_vault_secret(uuid) TO service_role;
