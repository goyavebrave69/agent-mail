# Deferred Work

## Deferred from: code review of 1-2-user-registration-and-email-verification (2026-03-28)

- `public.users.email` non synchronisé sur UPDATE `auth.users` — pas de trigger `AFTER UPDATE`. À adresser dans story 1.4 (suppression compte) ou migration dédiée.
- `updated_at` sans trigger auto-update — la colonne ne se met pas à jour lors des UPDATE sur `public.users`. Mineur.
- Pas de rate limiting sur `signUpAction` — à adresser en Epic 6 ou infrastructure dédiée.
