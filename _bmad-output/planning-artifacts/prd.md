---
workflow: 'edit'
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief.md
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
lastEdited: '2026-04-06'
editHistory:
  - date: '2026-04-05'
    changes: 'Reframed MailAgent around a composer-first inbox experience with on-demand AI reply generation, quote confirmation, and no persistent draft list.'
  - date: '2026-04-06'
    changes: 'Resolved FR/scope contradictions (removed confidence score FR, replaced background-generation FR with on-demand trigger). Added 5 missing FRs for core composer UX (reply composer, delete, quote confirmation, 3-generation limit). Refactored NFRs: removed Integration subsection, rewrote Security without tech names, added measurement methods to Performance, quantified Scalability and Reliability NFRs. Added browser support matrix and WCAG 2.1 AA accessibility requirement.'
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

MailAgent is an AI-powered email management web application for B2B professionals who need to move quickly through high-volume inboxes without losing accuracy or control. V1 focuses on a familiar, Outlook/Gmail-like inbox experience where the user reads an email, writes a reply in-place, and can trigger personalized AI assistance only when needed.

The product's core value is not background automation or a persistent draft system. Instead, MailAgent helps users respond faster through a simple composer-first flow: a reply textarea, a clear AI generation button, and visible actions for send, archive, and delete. The AI uses the current email thread plus the user's business knowledge base to generate a contextual response on demand.

If an incoming email looks like it requires a quote or attachment-based reply, MailAgent first asks for confirmation before generating that response type. The experience stays lightweight, predictable, and familiar — no training required.

### What Makes This Special

Existing tools (SaneBox, Superhuman, Copilot for Outlook) are either generic, rigid, or too complex for this workflow. MailAgent differentiates on three axes:

1. **Contextual replies** — The AI grounds every response in the user's uploaded business documents and the current customer email, not generic training data.
2. **Radical familiarity** — The interface borrows the interaction patterns users already know from Outlook and Gmail, so nothing feels surprising.
3. **Smart, on-demand assistance** — AI is triggered only when the user wants it, with a clear three-generation limit per email and no clutter from saved draft history.

The core insight: the real enemy is not email volume alone, but the friction of reading, deciding, and composing accurate replies quickly. MailAgent reduces that friction without taking control away from the user.

---

## Project Classification

- **Project Type:** Web App SaaS
- **Domain:** Productivity / AI-powered tools (B2B)
- **Complexity:** Medium — third-party API integrations (Gmail, Outlook), LLM processing, sensitive data handling (emails, business documents)
- **Project Context:** Greenfield

---

## Success Criteria

### User Success

- User processes their full daily inbox in under 30 minutes, versus 1–2 hours without the tool
- User can generate a usable reply in one click and keep the response in the composer without leaving the inbox view
- At least 70% of AI-assisted replies are sent after only light edits, showing the generated text is useful and personalized
- The interface feels familiar enough that users do not need training to understand where to read, reply, archive, or delete
- The three-generation limit per email is clear and rarely blocks legitimate use

### Business Success

- **Month 1:** 5 pilot users onboarded and actively using the product daily, with positive qualitative feedback
- **Month 3:** 50 daily active users (DAU) — the primary V1 success gate
- Pilot user retention at Day 30: ≥ 80% still active
- User-reported time saved ≥ 1 hour/day

### Technical Success

- Email sync latency: new emails appear within 2 minutes of receipt
- AI reply generation: personalized reply appears within 10 seconds of the user clicking the AI button
- Knowledge base processing: uploaded files indexed within 60 seconds
- System uptime: ≥ 99.5% during business hours
- Zero data leakage between user accounts

### Measurable Outcomes

| Metric | V1 Target |
|---|---|
| Daily Active Users (Month 1) | 5 pilot users |
| Daily Active Users (Month 3) | 50 users |
| AI-assisted replies sent with light edits | ≥ 70% |
| Time-to-process per email | < 30 seconds |
| D30 retention | ≥ 80% |
| Email sync latency | < 2 minutes |

---

## User Journeys

### Journey 1 — Thomas, B2B Sales Rep (Primary User — Success Path)

Thomas is a sales rep at a wood materials distributor. Every morning he opens MailAgent to a busy inbox full of quote requests, availability checks, follow-ups, and invoices. Instead of jumping between tools, he reads each message in the inbox shell and replies directly in the right-hand composer.

**First reply.** Thomas opens an email asking for a quote. He sees the familiar split-pane layout, types a short reply if needed, then clicks the AI wand button. MailAgent generates a personalized response using the incoming email and his uploaded business documents. The reply appears as plain text in the composer. Thomas reviews it, clicks Send, and moves on.

**Daily rhythm.** For routine emails, Thomas sends or archives immediately. For messages that clearly need no AI help, he writes manually. For quote-related emails, the confirmation pop-in appears first, so he stays in control of when a quote-oriented reply should be generated.

**Outcome.** After a few days, Thomas knows exactly where everything is: read on the left, reply in the composer, and use the same clear actions he already expects from Gmail or Outlook.

### Journey 2 — Sophie, SME Owner (Edge Case)

Sophie receives a message about a product that is not in her current catalog. The email looks like a quote request, so when she clicks the AI button, MailAgent asks a simple confirmation question before generating the response: whether she wants a quote-oriented reply.

She confirms, and MailAgent generates a cautious, personalized reply that acknowledges the request and proposes the next step. Sophie edits a few words, sends the message, and archives the thread. If she does not like the result, she can refine the reply manually or try AI again, up to the three-generation limit for that email.

### Journey 3 — Onboarding (First-Time Setup)

1. **Create account** — email and password, then email verification
2. **Connect mailbox** — choose Gmail, Outlook, or IMAP with a guided OAuth flow
3. **Upload knowledge base** — drag and drop CSV/Excel files, then wait for indexing
4. **Set preferences** — preferred tone, language, and basic inbox categories
5. **First sync** — MailAgent loads recent email and renders the inbox shell

If the setup flow feels too dense, a short help video remains accessible from onboarding.

### Journey 4 — Recovery / Fallback

A user is unhappy with one generated reply. Instead of digging through a draft history, they simply edit the text in the composer, click AI again if they want a better version, or finish the message manually. If the issue is caused by missing knowledge base data, they can update the files later and try again on a future email.

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Thomas — success path | Split-pane inbox, in-place reply composer, AI generation, send/archive/delete actions |
| Sophie — edge case | Quote confirmation pop-in, personalized generation, manual edit before send |
| Onboarding | Account creation, mailbox connection, knowledge base upload, guided setup |
| Recovery | Composer editing, retry generation up to the limit, manual fallback |

---

## Innovation Analysis

### Detected Innovation Areas

1. **Familiar composer-first email flow** — The product feels like a known mail client, but adds AI in the exact place users already expect to respond.
2. **On-demand contextual generation** — The AI uses the current email thread and the user's knowledge base only when the user asks for help.
3. **Intent-aware quote confirmation** — When the message implies a quote or attachment-based response, MailAgent slows down just enough to confirm the next step.

### Competitive Landscape

| Tool | Triage | AI Drafting | Business KB | Simplicity |
|---|---|---|---|---|
| Superhuman / SaneBox | ✅ | ❌ | ❌ | Medium |
| Copilot for Outlook | Partial | ✅ Generic | ❌ | Low |
| ChatGPT / Claude | ❌ | ✅ Generic | ❌ | Low |
| **MailAgent** | **✅** | **✅ Contextual** | **✅** | **High** |

The gap: no tool combines inbox integration, business-specific reply generation, and a familiar Outlook/Gmail-style composer with a simple quote confirmation flow.

### Validation Approach

- V1 pilot: users should be able to open an email and generate a usable reply on the first day without training
- AI-assisted replies should require only light edits in most cases
- The quote confirmation pop-in should reduce accidental quote-style responses while staying quick and unobtrusive
- Daily active usage remains the strongest trust proxy because the workflow is simple enough to become habitual

---

## Product Scope

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — V1 must deliver a complete, delightful end-to-end reply experience. The goal is not a draft engine or a separate AI workspace; it is a familiar mail flow that helps users answer messages faster.

**Resource Requirements:** Small team (1–2 developers + product owner). Next.js + Supabase keeps complexity manageable; LLM API removes the need for in-house AI infrastructure.

### MVP Feature Set (Phase 1)

| Capability | Rationale |
|---|---|
| Account creation & auth (Supabase) | Gate to all other features |
| Gmail OAuth + Outlook OAuth + IMAP fallback | Core email access |
| Email sync (every 5 min, async) | Foundation of the inbox experience |
| Auto-categorization (quote, inquiry, invoice, follow-up, spam) | Core triage value |
| Priority ranking | Surfaces urgent emails first |
| Split-pane inbox shell with in-place message reading | Familiar Outlook/Gmail-style layout |
| Reply composer with textarea and AI wand button | Primary reply experience |
| Visible actions: Send, Archive, Delete | Clear, familiar mail actions |
| Quote confirmation pop-in | Prevents the wrong response format |
| On-demand AI reply generation (RAG on KB + current thread) | Primary value proposition |
| Manual editing of generated replies | Full user control |
| Three-generation limit per email | Cost and misuse guardrail |
| Knowledge base upload (CSV/Excel, drag-and-drop) | Grounds AI in business reality |
| Guided onboarding + video | Removes friction for first-time setup |
| Single-user account, full data isolation (RLS) | Security baseline |

**Explicitly Out of V1 Scope:** Persistent draft list, background draft generation at sync time, confidence scoring, AI assistant bot, mobile app, multi-user accounts, billing, CRM/ERP integrations, Slack/webhook notifications.

**Browser Support:** Chrome, Firefox, Edge — latest 2 stable versions. Safari latest stable version. Desktop viewport only (minimum 1280px width).

**Accessibility:** WCAG 2.1 Level AA compliance required — keyboard navigation, sufficient color contrast, and screen reader compatibility for all core inbox and composer interactions.

### Phase 2 — Growth (Post-Pilot)

- Reply templates and tone presets
- More intelligent quote generation flows
- Mobile PWA
- Subscription billing (Stripe)
- User feedback loop focused on reply usefulness and editing effort

### Phase 3 — Expansion (V3 SaaS)

- Multi-user team accounts with role management
- CRM / ERP connectors
- Industry-agnostic onboarding + KB templates marketplace
- Advanced analytics (time saved, AI usage, quote-confirmation rate)
- API for third-party integrations
- Fully autonomous email handling for low-risk categories (auto-send after user-defined approval threshold)

---

## Domain Requirements

### Compliance & Data Privacy

- User emails are **never stored** — read on-demand via provider APIs only
- Knowledge base files (CSV/Excel) are stored encrypted at rest
- Generated replies are ephemeral composer state, not a persistent draft archive
- GDPR compliance is required at launch: privacy policy, data deletion rights, and a data processing agreement
- EU-hosted infrastructure is preferred for B2B European clients

### Third-Party Integration Constraints

- **Gmail OAuth verification:** Sensitive scope review required. Timeline: 4–8 weeks. V1 pilot (≤ 100 users) operates in test mode — initiate approval at project kickoff, not at launch
- **Microsoft Graph verification:** Azure AD publisher verification required; lower friction than Google for low volume
- **IMAP fallback:** First-class V1 feature supporting non-Gmail/Outlook mailboxes (OVH, corporate SMTP, etc.)

### Performance & AI Throughput

- AI reply generation is on-demand — it starts only after the user clicks the AI button
- LLM calls are throttled per user and globally to prevent overload and control costs
- There is no draft caching layer or background regeneration queue for saved drafts
- Urgent emails still receive priority in the inbox, but reply generation remains user-triggered

---

## Project-Type Requirements

### Architecture Overview

**Frontend:** Next.js (React) — cloud-hosted, desktop-first for V1, split-pane inbox shell, SSR for initial inbox load, client-side updates via Supabase Realtime

**Backend & Database:** Supabase — PostgreSQL with RLS, Supabase Auth (email/password + OAuth), Supabase Storage (encrypted file uploads), Supabase Realtime (live inbox updates)

**AI Layer:** LLM API (OpenAI / Anthropic) called server-side only; on-demand reply generation pipeline; knowledge base indexed as vector embeddings (RAG pattern)

**Email Integration:** Gmail API (OAuth 2.0), Microsoft Graph API (OAuth 2.0), IMAP/SMTP fallback

### Multi-Tenancy & Data Isolation

- Each user account is fully isolated: separate knowledge base, email connection, and composer state
- Row-Level Security (RLS) is enforced at the Supabase level — zero cross-account data access
- V1 uses a single role per account (owner = admin = user)
- V3 architecture anticipates multi-user team accounts without V1 over-engineering
- User accounts include a `plan` field from day one for future billing integration

### Implementation Notes

- Supabase Edge Functions or a lightweight Node.js/Python backend handle LLM orchestration and email sync jobs
- Email sync runs on a scheduled interval (every 5 minutes) per connected account
- Knowledge base re-indexing is triggered on file upload only, not on every LLM call
- All LLM calls remain server-side; no AI credentials are exposed to the browser

---

## Functional Requirements

### User Account Management

- FR1: A user can create an account with email and password
- FR2: A user can verify their email address to activate their account
- FR3: A user can log in and log out; sessions expire after a configurable inactivity period
- FR4: A user can delete their account and all associated data

### Email Provider Connection

- FR5: A user can connect a Gmail mailbox via OAuth
- FR6: A user can connect an Outlook mailbox via OAuth
- FR7: A user can connect any IMAP/SMTP mailbox with credentials
- FR8: A user can disconnect a connected mailbox
- FR9: The system syncs new emails from the connected mailbox automatically every 5 minutes

### Inbox & Triage

- FR10: The system automatically categorizes each email into: quote request, inquiry, invoice, follow-up, spam, or other
- FR11: The system assigns a priority ranking to each email based on category and content
- FR12: A user can view their inbox sorted by priority
- FR13: A user can filter their inbox by email category
- FR14: A user can mark an email as spam manually
- FR15: A user can mark an email as read or archived

### AI Draft Generation

- FR16: A user can trigger AI draft generation on demand for any email; the system generates a contextual reply using the current email thread and the user's knowledge base as the sole source of factual data
- FR17: A user can view an in-place reply composer alongside the email they are reading
- FR18: A user can view the AI-generated draft in the reply composer
- FR19: A user can validate and send a draft as-is with a single action
- FR20: A user can edit a draft manually before sending
- FR21: A user can request a new draft with an optional instruction (e.g., "offer a delay of 24h"); the system limits AI generation to 3 attempts per email
- FR22: A user can reject a draft and compose their own reply from scratch
- FR23: A user can delete an email from their inbox
- FR24: When an incoming email is detected as a potential quote request, the system prompts the user for confirmation before generating a quote-oriented reply

### Knowledge Base Management

- FR25: A user can upload one or more CSV or Excel files as their knowledge base
- FR26: A user can view the list of uploaded knowledge base files
- FR27: A user can delete a knowledge base file
- FR28: The system indexes uploaded files for use in AI draft generation
- FR29: The system re-indexes the knowledge base when a file is added or removed

### Onboarding

- FR30: A new user is guided through a step-by-step onboarding flow (account creation → mailbox connection → knowledge base upload → configuration)
- FR31: A user can configure their preferred reply tone (formal / informal) and language during onboarding
- FR32: A user can access an onboarding help video at any time from the onboarding screen

### Data & Security

- FR33: Each user's emails, knowledge base files, and generated replies are fully isolated from other users
- FR34: The system never stores user email content; emails are read on-demand from the connected mailbox provider
- FR35: Knowledge base files are stored encrypted at rest

---

## Non-Functional Requirements

### Performance

- Email sync latency: new emails appear in MailAgent within 2 minutes of receipt, as measured by end-to-end delivery timestamp comparison
- AI draft generation: reply draft appears in the composer within 10 seconds of the user triggering generation, as measured from click to text render
- Knowledge base indexing: uploaded files fully indexed and available for AI generation within 60 seconds of upload confirmation
- UI responsiveness: all user-initiated actions (send, archive, delete, filter) complete within 1 second under normal load, as measured by client-side interaction timing
- Email send: delivery confirmed to the user within 3 seconds of clicking send

### Security

- All data transmitted over HTTPS/TLS
- Knowledge base files stored encrypted at rest using cloud-provider managed encryption
- User email content never persisted server-side; read on-demand from the connected mailbox provider per request
- User data is fully isolated per account — no cross-account data access is possible at any layer
- AI generation credentials never exposed to client-side code; all AI calls are proxied server-side
- Authentication tokens never accessible to client-side scripts
- GDPR: user data deletion on account close within 30 days; privacy policy required at launch

### Scalability

- Supports 50 DAU at Month 3 with email sync latency and AI generation time remaining within Performance targets above
- Concurrent AI generation requests from multiple users are queued; no user waits more than 30 seconds for their generation to start
- Per-user AI call rate limited to a maximum of 20 generations per hour to control costs
- Data model supports future multi-user team accounts without V1 schema changes

### Reliability

- Application uptime ≥ 99.5% during business hours (Mon–Fri, 8h–20h), as measured by uptime monitoring
- Email sync failures retried automatically up to 3 times; user notified via in-app banner if sync remains degraded after retries
- IMAP/SMTP connection available as fallback if Gmail or Outlook APIs are unavailable
- AI generation failures display an error message with a retry button within 3 seconds; the composer never shows a blank or loading state indefinitely
