# Product Brief — MailAgent

**Version:** 1.0
**Date:** 2026-03-27
**Author:** Goyave

---

## Executive Summary

MailAgent is an AI-powered email management web application that dramatically reduces the time professionals spend processing high-volume inboxes. By automatically categorizing incoming emails, prioritizing them by urgency, and generating context-aware draft replies grounded in the user's own business knowledge, MailAgent transforms email from a daily burden into a streamlined, near-automated workflow.

The initial target is any professional handling 40–60+ emails per day across mixed request types — illustrated by the use case of a timber materials reseller managing quotes, inquiries, invoices, and follow-ups. The long-term vision is a horizontal SaaS serving any B2B knowledge worker who needs to reclaim time from their inbox.

---

## Problem Statement

Email remains the dominant communication channel in B2B contexts, yet the tools available have barely evolved. Professionals managing high-volume, mixed-intent inboxes spend significant time every day on three costly activities:

1. **Sorting and prioritizing** — manually reading each email to understand its nature and urgency
2. **Drafting replies** — composing responses that require knowledge of the business (pricing, stock, policies, history)
3. **Context switching** — jumping between email client, CRM, catalogs, and other systems to gather the information needed to respond

There is no tool today that connects email triage, AI response generation, and the user's own business knowledge in a single, simple interface.

---

## Proposed Solution

MailAgent provides a single-screen web application with three core capabilities:

### 1. Intelligent Triage
Emails synced from connected mailboxes (Gmail, Outlook, and other major providers) are automatically classified into categories — quotes, inquiries, invoices, follow-ups, spam, and others — and ranked by priority. The user sees a structured, actionable inbox instead of a raw stream.

### 2. AI-Generated Contextual Drafts
For each email, MailAgent generates a ready-to-send reply using:
- The content and intent of the incoming email
- The user's uploaded knowledge base (product catalog, pricing, client history, policies — via CSV/Excel files)
- A confidence score indicating how reliable the draft is

The user reviews the draft, edits if needed, and sends — or rejects it entirely. The human always has final control.

### 3. Knowledge Base Management
A drag-and-drop interface lets users upload and manage their business documents (CSV, Excel). The AI grounds all its responses exclusively in this uploaded knowledge — no hallucinated data.

---

## Key Features (V1)

| Feature | Description |
|---|---|
| Email sync | Connect Gmail, Outlook, and major IMAP providers |
| Auto-categorization | Classify emails into typed categories (quote, inquiry, invoice, follow-up, spam) |
| Priority ranking | Surface the most urgent emails first |
| AI draft generation | Context-aware reply drafts grounded in the user's knowledge base |
| Confidence scoring | Transparency on AI response quality per email |
| Draft editor | Edit AI drafts before sending |
| One-click actions | Validate & send / Modify / Reject / Mark as spam |
| Knowledge base upload | Drag-and-drop CSV/Excel files to train the AI on business data |
| Single-user account | Mono-account in V1; multi-user to follow |

---

## Target Users

**V1 — Validated use case:**
A professional at an SMB handling a mixed inbox of 40–60 emails/day, requiring business-specific knowledge to respond accurately (e.g., timber materials reseller responding to quote requests, availability checks, invoicing queries).

**Long-term SaaS target:**
Any B2B knowledge worker — regardless of industry — who spends excessive time managing email and would benefit from AI-assisted triage and drafting: sales teams, account managers, freelancers, small business owners, operations staff.

---

## Value Proposition

> "Stop managing your inbox. Let MailAgent handle the reading, sorting, and drafting — you just review and send."

- **Time saved:** Estimated 1–2 hours/day for a 50-email inbox
- **Accuracy:** Replies grounded in real business data, not generic AI
- **Control:** Human validation before every send — no black-box automation
- **Simplicity:** One screen, zero learning curve

---

## Product Roadmap

| Phase | Scope |
|---|---|
| **V1 — Web App** | Core triage + AI drafts + knowledge base upload + email sync (Gmail, Outlook) |
| **V2 — Mobile** | Native or PWA mobile experience for on-the-go review and sending |
| **V3 — SaaS** | Multi-user accounts, team features, subscription billing, onboarding flow, expanded integrations |

---

## Technical Context

- **Frontend:** Next.js (web app)
- **Email integrations:** Gmail API, Microsoft Graph API (Outlook), IMAP fallback
- **AI layer:** LLM-based classification and response generation, grounded on uploaded user documents
- **Knowledge base:** CSV and Excel file ingestion (V1); potential CRM/ERP connectors in future versions
- **Auth:** Single-user in V1

---

## Success Metrics (V1)

- Time-to-process per email (target: under 30 seconds including review)
- Draft acceptance rate (target: >70% sent without major edits)
- User-reported time saved per day
- Email sync reliability and latency

---

## Open Questions / Risks

- **AI accuracy on niche business data:** Quality of drafts depends heavily on the richness of uploaded documents — onboarding guidance will be critical
- **Email provider API compliance:** Gmail and Outlook OAuth flows have approval processes that may add lead time
- **Data privacy:** User emails and business documents are sensitive — a clear data handling and storage policy is required before any SaaS launch
