---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief.md
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: Web App SaaS
  domain: Productivity / AI-powered tools (B2B)
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document — MailAgent

**Author:** Goyave
**Date:** 2026-03-27

---

## Executive Summary

MailAgent is an AI-powered email management web application built for B2B professionals overwhelmed by high-volume, mixed-intent inboxes. It eliminates the three core costs of unmanaged email — time loss, chronic stress, and response errors — by automatically triaging incoming messages, generating context-aware draft replies grounded in the user's own business knowledge, and surfacing only what requires human attention.

The V1 target is any professional handling 40–60+ emails per day who needs business-specific accuracy in their responses (e.g., pricing, availability, policies). The long-term vision is a horizontal SaaS serving any B2B knowledge worker who wants to reclaim time from their inbox without sacrificing reply quality.

### What Makes This Special

Existing tools (SaneBox, Superhuman, Copilot for Outlook) are generic, rigid, or complex. MailAgent differentiates on three axes no competitor has combined:

1. **Adaptability** — The AI grounds every response in the user's uploaded business documents (CSV/Excel), not generic training data. No hallucinated prices, no generic replies.
2. **Radical simplicity** — A single-screen interface designed to disappear; the only decision left for the user is review and send.
3. **Customer-driven evolution** — The product roadmap is shaped by direct user feedback. MailAgent is tailored to each user's reality, not a one-size-fits-all solution.

The core insight: the real enemy is not email volume — it is the compounding cost of time × stress × error risk that drains professionals daily. MailAgent addresses all three simultaneously.

---

## Project Classification

- **Project Type:** Web App SaaS
- **Domain:** Productivity / AI-powered tools (B2B)
- **Complexity:** Medium — third-party API integrations (Gmail, Outlook), LLM processing, sensitive data handling (emails, business documents)
- **Project Context:** Greenfield

---

## Success Criteria

### User Success

- User processes their full daily inbox in under 30 minutes (vs. 1–2 hours without the tool)
- Draft acceptance rate ≥ 70% — sent without major edits, indicating AI response quality meets business standards
- Trust indicator: daily active usage sustained beyond the first week; the user integrates MailAgent into their routine and cannot operate without it
- Draft modification rate tracked as a proxy for AI quality — high edits signal knowledge base gaps, not product failure

### Business Success

- **Month 1:** 5 pilot users onboarded and actively using the product daily, with positive qualitative feedback
- **Month 3:** 50 daily active users (DAU) — the primary V1 success gate
- Pilot user retention at Day 30: ≥ 80% still active
- User-reported time saved ≥ 1 hour/day

### Technical Success

- Email sync latency: new emails appear within 2 minutes of receipt
- AI draft generation: draft available within 10 seconds of email sync completion
- Knowledge base processing: uploaded files indexed within 60 seconds
- System uptime: ≥ 99.5% during business hours
- Zero data leakage between user accounts

### Measurable Outcomes

| Metric | V1 Target |
|---|---|
| Daily Active Users (Month 1) | 5 pilot users |
| Daily Active Users (Month 3) | 50 users |
| Draft acceptance rate | ≥ 70% |
| Time-to-process per email | < 30 seconds |
| D30 retention | ≥ 80% |
| Email sync latency | < 2 minutes |

---

## User Journeys

### Journey 1 — Thomas, Commercial B2B (Primary User — Success Path)

Thomas est commercial chez un revendeur de matériaux bois. Chaque matin, il arrive au bureau avec 40 à 60 emails non lus : demandes de devis, vérifications de disponibilité, relances clients, factures. Il passe ses deux premières heures à tout lire, chercher les prix dans son catalogue Excel, et rédiger des réponses une par une. Résultat : il est déjà épuisé à 10h, et il a encore oublié une relance urgente.

**Découverte de MailAgent.** Thomas connecte son compte Gmail, uploade son catalogue produits et sa grille tarifaire en CSV. Une configuration guidée l'accompagne étape par étape. Dix minutes plus tard, MailAgent a ingéré ses données.

**Le premier matin.** Il ouvre MailAgent. Sa boîte est triée : 3 devis urgents en tête, 8 demandes de renseignements, 5 relances, 2 factures, 4 emails classés spam. Pour chaque email urgent, un draft est déjà prêt — le prix du chêne massif en 50mm, la disponibilité en stock, le délai de livraison. Tout vient de son propre catalogue. Il lit, clique "Valider & Envoyer". Trois devis traités en 8 minutes.

**La nouvelle réalité.** Après deux semaines, Thomas ne peut plus imaginer travailler sans MailAgent. Il traite sa boîte en 25 minutes chaque matin, ne rate plus aucune relance urgente, et ses clients reçoivent des réponses précises plus rapidement qu'avant.

### Journey 2 — Sophie, Gérante de PME (Primary User — Edge Case)

Sophie gère une petite entreprise de négoce. Ce matin, elle reçoit un email sur un produit absent de son catalogue — les prix n'ont pas encore été uploadés. MailAgent génère un draft avec un score de confiance faible (32%). Sophie voit immédiatement qu'il ne convient pas.

Elle clique "Régénérer" et tape une instruction rapide : *"Ce produit n'est pas dans mon catalogue, propose un email pour demander un délai et promettre un devis sous 24h."* L'IA génère un nouveau draft. Sophie l'ajuste légèrement et l'envoie. Elle comprend que la qualité des drafts dépend de ce qu'elle a uploadé — elle enrichit son catalogue. Le lendemain, les drafts sur ce type de demande sont parfaits.

### Journey 3 — Onboarding (First-Time Setup)

1. **Création de compte** — email + mot de passe, vérification email
2. **Connexion boîte mail** — choix Gmail / Outlook / IMAP, flow OAuth guidé
3. **Upload knowledge base** — drag-and-drop CSV/Excel, confirmation d'indexation (60 secondes)
4. **Configuration guidée** — catégories à surveiller, ton de réponse (formel/informel), langue
5. **Premier sync** — MailAgent importe les 50 derniers emails et les classe

Si la configuration guidée est trop complexe : une vidéo de démarrage rapide (< 3 minutes) est accessible depuis l'écran d'onboarding à tout moment.

### Journey 4 — Utilisateur en difficulté (Recovery)

Un utilisateur remarque des scores de confiance systématiquement bas (< 40%). Il identifie la cause : son CSV a été uploadé avec une mauvaise structure de colonnes. Il re-uploade un fichier corrigé et la qualité des drafts remonte immédiatement. En V1, le support se fait par email ou via la vidéo d'aide.

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Thomas — success path | Email sync, categorization, priority ranking, draft generation, confidence score, one-click send |
| Sophie — edge case | Draft regeneration with user instruction, confidence score display, reject/modify actions |
| Onboarding | Account creation, OAuth connection, CSV/Excel upload + indexation, guided setup, onboarding video |
| Recovery | Knowledge base re-upload, draft quality feedback loop |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Knowledge-grounded AI drafting** — Draft generation anchored exclusively to user-uploaded business documents. Eliminates hallucination risk on factual data (prices, availability, policies). No existing email tool offers this level of personalized grounding.
2. **Unified triage-to-send workflow** — Single interface combining categorization, priority ranking, AI drafting, and sending. Competing tools solve one problem; MailAgent collapses the full workflow into one screen.
3. **Adaptability as a product principle** — The roadmap is driven by direct user feedback loops, treating adaptability as a core feature rather than a release note.

### Competitive Landscape

| Tool | Triage | AI Drafting | Business KB | Simplicity |
|---|---|---|---|---|
| Superhuman / SaneBox | ✅ | ❌ | ❌ | Medium |
| Copilot for Outlook | Partial | ✅ Generic | ❌ | Low |
| ChatGPT / Claude | ❌ | ✅ Generic | ❌ | Low |
| **MailAgent** | **✅** | **✅ Grounded** | **✅** | **High** |

The gap: no tool combines inbox integration + business-specific AI drafting + radical simplicity for SMB/B2B users.

### Validation Approach

- V1 pilot: draft acceptance rate ≥ 70% is the primary innovation validator
- Draft modification rate reveals KB grounding failures — direct feedback loop
- Daily active usage as trust proxy — genuine innovation creates habit, not occasional use

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — V1 must deliver a complete, delightful end-to-end experience. The goal is not a prototype; it is a product that 5 pilot users will use daily and cannot work without.

**Resource Requirements:** Small team (1–2 developers + product owner). Next.js + Supabase keeps complexity manageable; LLM API removes the need for in-house AI infrastructure.

### MVP Feature Set (Phase 1)

| Capability | Rationale |
|---|---|
| Account creation & auth (Supabase) | Gate to all other features |
| Gmail OAuth + Outlook OAuth + IMAP fallback | Core email access |
| Email sync (every 5 min, async) | Foundation of the inbox experience |
| Auto-categorization (quote, inquiry, invoice, follow-up, spam) | Core triage value |
| Priority ranking | Surfaces urgent emails first |
| AI draft generation (async, RAG on KB) | Primary value proposition |
| Confidence score per draft | Trust mechanism |
| Draft editor: validate / modify / regenerate / reject | Full user control |
| Knowledge base upload (CSV/Excel, drag-and-drop) | Grounds AI in business reality |
| Guided onboarding + video | Removes friction for first-time setup |
| Single-user account, full data isolation (RLS) | Security baseline |

**Explicitly Out of V1 Scope:** AI assistant bot, mobile app, multi-user accounts, billing, CRM/ERP integrations, Slack/webhook notifications.

### Phase 2 — Growth (Post-Pilot)

- AI assistant bot — conversational interface to query KB and email context
- Mobile PWA
- Subscription billing (Stripe)
- User feedback loop integrated into draft quality scoring

### Phase 3 — Expansion (V3 SaaS)

- Multi-user team accounts with role management
- CRM / ERP connectors
- Industry-agnostic onboarding + KB templates marketplace
- Advanced analytics (time saved, draft acceptance trends)
- API for third-party integrations
- Fully autonomous email handling for low-risk categories (auto-send after user-defined approval threshold)

---

## Domain-Specific Requirements

### Compliance & Data Privacy

- User emails are **never stored** — read on-demand via provider APIs only
- Knowledge base files (CSV/Excel) stored encrypted at rest
- GDPR compliance required at launch: privacy policy, data deletion rights, data processing agreement
- EU-hosted infrastructure preferred for B2B European clients

### Third-Party Integration Constraints

- **Gmail OAuth verification:** Sensitive scope review required. Timeline: 4–8 weeks. V1 pilot (≤ 100 users) operates in test mode — initiate approval process at project kickoff, not at launch
- **Microsoft Graph verification:** Azure AD publisher verification required; lower friction than Google for low volume
- **IMAP fallback:** First-class V1 feature supporting non-Gmail/Outlook mailboxes (OVH, corporate SMTP, etc.)

### Performance & AI Throughput

- Draft generation is asynchronous — pre-generated at sync time, never blocking the UI
- LLM calls throttled per user and globally to prevent overload and control costs
- Draft caching: a generated draft is not regenerated until email status changes
- Priority queue: urgent emails processed first by the AI pipeline

---

## SaaS B2B Technical Requirements

### Architecture Overview

**Frontend:** Next.js (React) — cloud-hosted, desktop-first for V1, SSR for initial inbox load, client-side updates via Supabase Realtime

**Backend & Database:** Supabase — PostgreSQL with RLS, Supabase Auth (email/password + OAuth), Supabase Storage (encrypted file uploads), Supabase Realtime (live inbox updates)

**AI Layer:** LLM API (OpenAI / Anthropic) called server-side only; async job queue for draft generation; knowledge base indexed as vector embeddings (RAG pattern)

**Email Integration:** Gmail API (OAuth 2.0), Microsoft Graph API (OAuth 2.0), IMAP/SMTP fallback

### Multi-Tenancy & Data Isolation

- Each user account fully isolated: separate knowledge base, email connection, and draft history
- Row-Level Security (RLS) enforced at Supabase level — zero cross-account data access
- V1: single role per account (owner = admin = user)
- V3 architecture anticipates multi-user team accounts without V1 over-engineering
- User accounts include a `plan` field from day one for future billing integration

### Implementation Notes

- Supabase Edge Functions or lightweight Node.js/Python backend for LLM orchestration and email sync jobs
- Email sync on scheduled interval (every 5 minutes) per connected account
- Knowledge base re-indexing triggered on file upload only, not on every LLM call
- All LLM calls server-side; no AI credentials exposed to the browser

---

## Functional Requirements

### User Account Management

- FR1: A user can create an account with email and password
- FR2: A user can verify their email address to activate their account
- FR3: A user can log in and log out securely
- FR4: A user can delete their account and all associated data

### Email Provider Connection

- FR5: A user can connect a Gmail mailbox via OAuth
- FR6: A user can connect an Outlook mailbox via OAuth
- FR7: A user can connect any IMAP/SMTP mailbox with credentials
- FR8: A user can disconnect a connected mailbox
- FR9: The system syncs new emails from the connected mailbox automatically at regular intervals

### Inbox & Triage

- FR10: The system automatically categorizes each email into: quote request, inquiry, invoice, follow-up, spam, or other
- FR11: The system assigns a priority ranking to each email based on category and content
- FR12: A user can view their inbox sorted by priority
- FR13: A user can filter their inbox by email category
- FR14: A user can mark an email as spam manually
- FR15: A user can mark an email as read or archived

### AI Draft Generation

- FR16: The system generates a draft reply for each incoming email using the user's knowledge base as the sole source of factual data
- FR17: The system displays a confidence score for each generated draft
- FR18: A user can view the generated draft for any email
- FR19: A user can validate and send a draft as-is with a single action
- FR20: A user can edit a draft manually before sending
- FR21: A user can request a new draft with an optional instruction (e.g., "offer a delay of 24h")
- FR22: A user can reject a draft and compose their own reply
- FR23: The system generates drafts asynchronously at sync time, not on demand

### Knowledge Base Management

- FR24: A user can upload one or more CSV or Excel files as their knowledge base
- FR25: A user can view the list of uploaded knowledge base files
- FR26: A user can delete a knowledge base file
- FR27: The system indexes uploaded files for use in AI draft generation
- FR28: The system re-indexes the knowledge base when a file is added or removed

### Onboarding

- FR29: A new user is guided through a step-by-step onboarding flow (account creation → mailbox connection → knowledge base upload → configuration)
- FR30: A user can configure their preferred reply tone (formal / informal) and language during onboarding
- FR31: A user can access an onboarding help video at any time from the onboarding screen

### Data & Security

- FR32: Each user's emails, knowledge base files, and drafts are fully isolated from other users
- FR33: The system never stores user email content — emails are read on-demand via provider APIs
- FR34: Knowledge base files are stored encrypted at rest

---

## Non-Functional Requirements

### Performance

- Email sync latency: new emails appear in MailAgent within 2 minutes of receipt
- AI draft generation: draft available within 10 seconds of email sync completion (async — not blocking the UI)
- Knowledge base indexing: uploaded files fully indexed within 60 seconds
- UI responsiveness: all user actions complete within 1 second regardless of AI pipeline load
- Email send: confirmed as sent within 3 seconds of user validation

### Security

- All data transmitted over HTTPS/TLS
- Knowledge base files encrypted at rest (Supabase Storage)
- User email content never persisted — read on-demand via provider APIs only
- Row-Level Security (RLS) at database level — zero cross-account data access
- LLM API calls server-side only — no AI credentials exposed to the browser
- OAuth tokens stored server-side, never in browser localStorage
- GDPR: user data deletion on account close, privacy policy required at launch

### Scalability

- Supports 50 DAU at Month 3 without degradation
- AI job queue handles concurrent draft generation across all active users without blocking
- Per-user LLM call throttling prevents cost spikes
- Architecture anticipates V3 multi-user accounts without V1 over-engineering

### Reliability

- Application uptime ≥ 99.5% during business hours (Mon–Fri, 8h–20h)
- Email sync failures retried automatically; user notified if sync is degraded
- IMAP fallback available if Gmail or Outlook APIs are unavailable
- Draft generation failures handled gracefully — error with retry option, never a blank state

### Integration

- Gmail API: OAuth 2.0 scopes limited to minimum required (read, send, label)
- Microsoft Graph API: OAuth 2.0 with equivalent minimum scopes
- IMAP/SMTP: standard ports (993/465) with TLS
- LLM provider API: abstracted server-side to allow provider switching without frontend changes
- Supabase Realtime: live inbox updates — fallback to polling if WebSocket unavailable
