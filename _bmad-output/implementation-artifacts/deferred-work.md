# Deferred Work

## Deferred from: 5-16-sprint-2-efficiency review (2026-04-21)

- **Select-all ne couvre pas les emails hors filtres** (`inbox-shell.tsx`) — Le header checkbox sélectionne `filteredEmails` uniquement ; si l'utilisateur change de filtre après une sélection partielle, les IDs sélectionnés peuvent ne plus correspondre à ce qui est visible. Comportement acceptable actuellement ; à revisiter si la navigation par filtre devient fluide (Sprint 3).
- **`handleBulkArchive` / `handleBulkTrash` await bloquant** (`inbox-shell.tsx`) — L'action DB est attendue avant l'update optimiste. Pour N emails élevé (>50), la latence est perceptible. Inverser l'ordre (optimiste d'abord, rollback sur erreur) est une amélioration de perf future.
- **Keyboard handler stale closure sur `localStarred`** (`inbox-shell.tsx`) — Le `useEffect` du keyboard handler dépend de `localStarred` dans ses deps, ce qui re-crée le handler à chaque toggle d'étoile. Acceptable mais peut être optimisé avec `useRef` pour `localStarred`.

## Deferred from: 5-15-sprint-1-inbox-fundamentals review (2026-04-21)

- **`document.execCommand` deprecated** (`compose-sheet.tsx`) — Fonctionnel aujourd'hui mais déprécié. Remplacement par Tiptap/ProseMirror nécessite une décision sur les dépendances (contrainte "no new UI deps"). À adresser en Sprint 2 ou Sprint 3.
- **Email regex trop permissif** (`compose-sheet.tsx`) — Le pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` n'exclut pas les adresses malformées. Amélioration mineure, pas de bug bloquant.
- **`window.location.href` dans QuoteDialog** (`quote-dialog.tsx`) — Navigation hard-reload dans deux states (NoKbMatch, OutOfScope). Pre-existing. Remplacer par `useRouter().push()`.
- **`"send répondre"` aria-label bilingue** (`manual-compose.tsx`) — L'aria-label est construit comme `"Send ${modeLabel}"` (en/fr mixte). Pre-existing depuis story 5-13. À corriger en sprint dédié i18n.
- **Nested `<button>` dans `<button>`** (`inbox-shell.tsx` ~L511) — La star button est imbriquée dans la row button. HTML invalide selon spec. `e.stopPropagation()` fonctionne sur les navigateurs modernes mais Safari/VoiceOver peut avoir des comportements inattendus. À restructurer (ex: CSS `position: absolute` pour la star).
- **`filteredEmails` stale closure race** (`inbox-shell.tsx`) — `advanceAfterAction` reçoit `filteredEmails` capturé avant l'await. Si un INSERT Realtime arrive pendant l'action (~500ms), l'index calculé peut être décalé. Faible probabilité. Fix: `filteredEmailsRef.current`.
- **`draftConfidenceScore` state partiellement orphelin** (`inbox-shell.tsx`) — Initialisé au chargement d'un draft existant mais non mis à jour lors d'une génération Realtime fraîche. Investigation à poursuivre.
- **`processedCount` survit au `router.refresh()`** (`inbox-shell.tsx`) — Le compteur n'est pas remis à zéro quand la prop `emails` change (après refresh). L'InboxZeroState peut afficher un compteur obsolète.

## Deferred from: spec-ai-draft-streaming-animation (2026-04-09)

- `handleDraftUpdate` (Realtime path in `draft-section.tsx`) bypasses the typewriter animation and writes content directly to the store. If the Realtime subscription fires before `handleCreateDraft`'s fetch resolves, content appears instantly without animation. Pre-existing architectural decision; not introduced by this change.

## Deferred from: code review of 1-2-user-registration-and-email-verification (2026-03-28)

- `public.users.email` non synchronisé sur UPDATE `auth.users` — pas de trigger `AFTER UPDATE`. À adresser dans story 1.4 (suppression compte) ou migration dédiée.
- `updated_at` sans trigger auto-update — la colonne ne se met pas à jour lors des UPDATE sur `public.users`. Mineur.
- Pas de rate limiting sur `signUpAction` — à adresser en Epic 6 ou infrastructure dédiée.
