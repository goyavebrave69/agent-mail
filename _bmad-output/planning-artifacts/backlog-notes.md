# Backlog Notes — Décisions & idées futures

## LLM API Cost Management & Subscription Tiers

**Date :** 2026-03-30
**Source :** Goyave

### Contexte

Le pipeline RAG (génération de draft) appelle des LLMs (GPT-4 / Claude) à chaque email entrant, ce qui représente le coût dominant (~$0.01–0.05 par draft). Sans contrôle, des utilisateurs à forte volumétrie pourraient générer des pertes.

### Décision souhaitée

Mettre en place un système de gestion des appels API LLM structuré autour d'abonnements, avant la mise en production :

1. **Quota par palier** — limiter le nombre de drafts générés / embeddings produits par mois selon l'abonnement de l'utilisateur
2. **Tiers d'abonnement** — ex. Free (N drafts/mois), Pro (M drafts/mois), Business (illimité ou quota élevé) — à calibrer selon les coûts réels observés
3. **Guardrails techniques** — `lib/ai/throttle.ts` est déjà prévu dans l'architecture (`checkUserLlmQuota()`) — à implémenter en s'appuyant sur un compteur en DB (table `usage` ou colonne sur `users`)
4. **Billing integration** — le champ `plan` sur `users` est prévu dès V1 pour brancher un système de billing (Stripe ou autre) plus tard

### À faire (epic futur)

- Définir les paliers et leurs limites (PM)
- Implémenter `checkUserLlmQuota()` dans `lib/ai/throttle.ts`
- Intégrer le quota check dans `generate-draft` Edge Function et `index-kb`
- Créer une table ou colonne de suivi de consommation mensuelle
- Brancher un provider billing (Stripe) — epic 7 ou 8 potentiellement
