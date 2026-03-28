---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-27'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief.md
  - _bmad-output/planning-artifacts/prd.md
workflowType: 'architecture'
project_name: 'mail-agent'
user_name: 'Goyave'
date: '2026-03-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
34 FRs organized across 6 domains: account management (FR1–4), email provider connection (FR5–9), inbox triage (FR10–15), AI draft generation (FR16–23), knowledge base management (FR24–28), and onboarding (FR29–31). The AI pipeline (FR16–23) is the primary value delivery mechanism and requires the most careful architectural treatment.

**Non-Functional Requirements:**
Performance SLAs drive architectural patterns:
- Email sync: < 2 min latency → async polling/webhook architecture required
- Draft generation: < 10 sec post-sync → pre-generation pipeline, not on-demand
- KB indexing: < 60 sec → streaming vector ingestion
- UI actions: < 1 sec → decoupled from AI pipeline entirely
- Uptime: ≥ 99.5% business hours → reliability patterns required

Security NFRs are non-negotiable: no email persistence, RLS enforcement, server-side-only LLM, encrypted KB at rest, GDPR compliance at launch.

**Scale & Complexity:**

- Primary domain: Full-stack SaaS web application with AI pipeline backend
- Complexity level: Medium
- Estimated architectural components: ~8 (Auth, Email Sync, Triage Engine, Draft Generation Pipeline, Knowledge Base Service, Vector Store, Realtime/Notification, Frontend App)

### Technical Constraints & Dependencies

- **Stack locked:** Next.js + Supabase is the chosen stack; architecture decisions operate within these boundaries
- **Gmail OAuth approval:** 4–8 week review process; V1 pilot (<100 users) runs in test mode — must initiate at kickoff
- **Email non-persistence:** Emails read on-demand via provider APIs only; no email content in database
- **LLM provider abstraction:** Server-side only; abstracted to allow provider switching (OpenAI ↔ Anthropic) without frontend impact
- **EU hosting preferred** for GDPR compliance with B2B European clients
- **Supabase pgvector** as candidate vector store (native to stack, reduces ops overhead)

### Cross-Cutting Concerns Identified

1. **Async processing** — Email sync, AI categorization, draft generation, and KB indexing are all async; job queue and state management patterns needed throughout
2. **Data isolation** — RLS at every data layer; tenant isolation is a hard constraint in every component design
3. **Observability** — Draft confidence scores, sync latency, draft acceptance rates are product-critical metrics requiring structured logging from day one
4. **Error handling & resilience** — Sync failures, LLM timeouts, KB indexing errors must degrade gracefully with user notification; no silent failures
5. **Cost management** — Per-user LLM throttling + draft caching to prevent cost spikes at scale

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — Next.js 16 + Supabase, as defined in the PRD.

### Starter Options Considered

- **`create-next-app --example with-supabase`** (Vercel/official) — canonical starting point
- **Nextbase Lite** — richer toolchain but more setup overhead for a 1-2 dev team
- **Razikus supabase-nextjs-template** — too many V3+ features included out of the box

### Selected Starter: `create-next-app --example with-supabase`

**Rationale for Selection:**
Official Vercel-maintained starter, kept in sync with Next.js releases. Provides the exact auth architecture needed for MailAgent (server-side OAuth token handling via `@supabase/ssr`). Minimal enough to not constrain the custom AI pipeline architecture. Intermediate team can be productive immediately.

**Initialization Command:**

```bash
npx create-next-app --example with-supabase mail-agent
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict mode, Next.js 16 App Router, Node.js runtime

**Styling Solution:**
Tailwind CSS + shadcn/ui (base component library) + Magic UI (animated/enhanced components). Magic UI is installed on top of shadcn/ui and shares the same Tailwind + Radix UI foundation — zero conflict. Use Magic UI for high-impact UI moments (onboarding, confidence score displays, loading states, inbox transitions).

**Build Tooling:**
Next.js built-in (Turbopack in dev, webpack for prod), Vercel-optimized deployment

**Testing Framework:**
Not included — to be added: Vitest (unit) + Playwright (e2e)

**Code Organization:**
```
/app          – App Router pages, layouts, API route handlers, Server Actions
/components   – shadcn/ui + Magic UI + custom UI components
/lib          – Supabase clients (server/client/middleware), utilities
/lib/ai       – LLM orchestration, RAG pipeline (to be created)
/lib/email    – Gmail/Outlook/IMAP sync adapters (to be created)
```

**Development Experience:**
- Supabase auth works in Server Components, Client Components, Middleware, Server Actions
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new key format)
- One-click Vercel deploy with auto env vars

**Note:** Project initialization using this command should be the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Vector store: Supabase pgvector
- Job queue: Supabase pg_cron + Edge Functions
- OAuth token storage: Supabase Vault
- API paradigm: Server Actions (UI) + Route Handlers (webhooks)
- Realtime: Supabase Realtime + polling fallback

**Important Decisions (Shape Architecture):**
- State management: RSC + Zustand + Supabase Realtime
- Hosting: Vercel (EU region)

**Deferred Decisions (Post-MVP):**
- Vector store migration to external service (Pinecone/Qdrant) if pgvector hits scale limits
- Job queue migration to BullMQ + Redis (Upstash) if pg_cron/Edge Function limits reached
- Billing infrastructure (Stripe) — Phase 2

### Data Architecture

**Vector Store:** Supabase pgvector (native extension)
- Rationale: Zero additional infrastructure, RLS isolation applies automatically per user, sufficient for V1 scale (50 DAU). Migrate to dedicated vector DB post-V1 if needed.
- Affects: Knowledge Base Service, RAG pipeline, `/lib/ai`

**Job Queue & Scheduling:** Supabase pg_cron + Edge Functions
- Rationale: Native to stack, no external service needed for V1. pg_cron triggers the email sync loop every 5 minutes per connected account. Edge Functions execute the AI pipeline steps.
- Migration path: BullMQ + Upstash Redis post-V1 if retry complexity or throughput requires it.
- Affects: Email sync, draft generation pipeline, KB indexing

**Database:** Supabase PostgreSQL with RLS
- Row-Level Security enforced at DB level for all user data tables
- Migrations managed via Supabase CLI

### Authentication & Security

**Auth Provider:** Supabase Auth (email/password + OAuth 2.0)
- Session handling via `@supabase/ssr` — works in Server Components, Middleware, Server Actions

**OAuth Token Storage:** Supabase Vault
- Gmail and Outlook OAuth access/refresh tokens stored in Supabase Vault (encrypted secrets store)
- Never in browser localStorage, never in plain DB columns
- Affects: Email provider connection flow (FR5–FR8)

**Authorization:** RLS policies on all tables
- Every table scoped to `auth.uid()` — zero cross-account data access by construction

### API & Communication Patterns

**Server Actions:** Used for all UI-initiated mutations
- Validate & send draft, edit draft, upload KB file, disconnect mailbox, update preferences
- Co-located with UI components, type-safe end-to-end

**Route Handlers:** Used for external-facing endpoints only
- OAuth callback routes (Gmail, Outlook)
- Webhook receivers (future: email provider push notifications)

**Realtime:** Supabase Realtime subscriptions
- Live inbox updates pushed to client when new emails/drafts are ready
- Fallback: polling every 30s if WebSocket unavailable

**Error Handling Standard:** Never silent failures
- All async pipeline errors (sync, LLM, KB indexing) surface as structured DB state
- UI reads error state and shows user-facing notification with retry option

### Frontend Architecture

**Rendering Strategy:**
- React Server Components for inbox views, email lists, KB management (data-heavy, fast TTFB)
- Client Components for draft editor, real-time inbox updates, interactive actions

**State Management:**
- URL state (searchParams) for inbox filters and category selection
- Zustand for local UI state: draft editor content, modal open/close, optimistic send state
- Supabase Realtime for live data (new emails, draft ready status)
- No Redux, no React Context for global state

**UI Component Stack:**
- shadcn/ui — base components (forms, buttons, dialogs, tables)
- Magic UI — high-impact moments: onboarding animations, confidence score display, loading states, inbox transitions

### Infrastructure & Deployment

**Hosting:** Vercel
- EU region for GDPR compliance (Frankfurt)
- Native Next.js optimization, preview deployments per PR
- Environment variables managed via Vercel dashboard

**Email Sync Scheduler:** Supabase pg_cron
- Cron job triggers Edge Function every 5 minutes per active connected account
- Migration path: Inngest or BullMQ if pg_cron scheduling granularity is insufficient

**CI/CD:** GitHub Actions + Vercel preview deployments
- Automatic preview per PR, production deploy on main merge

### Decision Impact Analysis

**Implementation Sequence:**
1. Project init (`create-next-app --example with-supabase`)
2. DB schema + RLS policies (users, email_connections, drafts, kb_files, embeddings)
3. Supabase Vault setup for OAuth tokens
4. Auth flow (signup, login, email verification)
5. Email provider OAuth connection (Gmail → Outlook → IMAP)
6. pg_cron email sync job + Edge Function
7. pgvector KB indexing pipeline
8. RAG draft generation pipeline
9. Inbox UI (RSC + Realtime)
10. Draft editor (Zustand + Server Actions)

**Cross-Component Dependencies:**
- pgvector embeddings table depends on KB upload pipeline being complete before draft generation works
- Draft generation pipeline depends on email sync being operational
- Supabase Vault setup must precede any OAuth connection flow
- RLS policies must be in place before any user data is written

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL/Supabase):**
- Tables: `snake_case` plural — `email_connections`, `kb_files`, `draft_cache`
- Columns: `snake_case` — `user_id`, `created_at`, `confidence_score`
- Foreign keys: `{singular_table}_id` — `user_id`, `kb_file_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_drafts_user_id`
- RLS policies: `{table}_{action}_{role}` — `drafts_select_owner`

**TypeScript Code:**
- React components: PascalCase — `DraftEditor`, `InboxList`
- Component files: `kebab-case.tsx` — `draft-editor.tsx`, `inbox-list.tsx`
- Functions/hooks: camelCase — `useDraftEditor()`, `syncEmails()`
- Types/Interfaces: PascalCase — `DraftStatus`, `EmailCategory`
- Variables: camelCase — `confidenceScore`, `userId`
- Constants: SCREAMING_SNAKE_CASE — `MAX_DRAFT_RETRIES`, `SYNC_INTERVAL_MS`
- Server Actions: camelCase in `/app/.../actions.ts` — `validateDraft()`, `uploadKbFile()`

**Next.js App Router Routes:**
- Route segments: `kebab-case` — `/inbox`, `/knowledge-base`, `/settings`
- Route handlers: `route.ts` inside the route folder
- Server Actions: `actions.ts` co-located with the page that uses them

### Structure Patterns

**Component Organization:**
```
/components
  /ui          – shadcn/ui primitives + Magic UI (never modified directly)
  /inbox       – inbox feature components
  /draft       – draft editor feature components
  /kb          – knowledge base feature components
  /onboarding  – onboarding feature components
  /shared      – reusable cross-feature components
```

**Tests: co-located with source files**
```
draft-editor.tsx
draft-editor.test.tsx    ← same folder
```

**Supabase Clients:**
```
/lib/supabase
  server.ts      – createServerClient (Server Components, Server Actions)
  client.ts      – createBrowserClient (Client Components)
  middleware.ts  – createMiddlewareClient
```

### Format Patterns

**API Responses (Route Handlers) — always this structure:**
```typescript
// Success
{ data: T, error: null }
// Error
{ data: null, error: { message: string, code: string } }
```

**Dates:** Always ISO 8601 (`2026-03-27T10:00:00Z`) in DB and APIs — never Unix timestamps.

**JSON fields:** `snake_case` in DB, `camelCase` in TypeScript (via auto-generated Supabase types).

**Draft status enum (strict — never free strings):**
```typescript
type DraftStatus = 'pending' | 'generating' | 'ready' | 'sent' | 'rejected' | 'error'
```

**Email category enum (strict):**
```typescript
type EmailCategory = 'quote' | 'inquiry' | 'invoice' | 'follow_up' | 'spam' | 'other'
```

### Communication Patterns

**Supabase Realtime channel naming:**
```
inbox:{user_id}     – new emails
drafts:{user_id}    – draft ready/error
kb:{user_id}        – indexing complete
```

**Zustand stores — one store per domain:**
```typescript
useInboxStore()    – filters, active email selection
useDraftStore()    – draft content in edit, optimistic state
useKbStore()       – upload state, file list
```
Never a single global store.

### Process Patterns

**Error Handling:**
```typescript
// Server Actions — always return, never throw to client
return { success: false, error: 'DRAFT_GENERATION_FAILED' }
// Components — Error Boundary for unexpected errors
// Explicit error states in UI, never blank screen
```

**Loading States:**
```typescript
// Standard pattern for Server Actions
const [isPending, startTransition] = useTransition()
// Zustand for optimistic state (e.g., email marked sent before confirmation)
```

**Async pipeline — DB status convention:**
Every async job must have a `status` column with defined values and a nullable `error_message` column:
```
status: 'pending' → 'generating' → 'ready' | 'error'
error_message: null | string
retry_count: integer default 0
```

**LLM Throttling — always check quota before LLM call:**
```typescript
// Centralized utility in /lib/ai/throttle.ts
await checkUserLlmQuota(userId)
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow DB naming conventions without exception (snake_case, plural tables)
2. Use strict enums for `DraftStatus` and `EmailCategory` — never free strings
3. Create RLS policies in every new migration
4. Return `{ data, error }` from all Route Handlers
5. Place Server Actions in `actions.ts` co-located with the page that uses them
6. Never expose LLM or OAuth credentials client-side
7. Never store email content in the database — read-only via provider API
8. Always use the centralized Supabase client from `/lib/supabase` — never instantiate directly

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
mail-agent/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                        – Supabase session refresh + route protection
├── .env.local                           – local secrets (gitignored)
├── .env.example                         – template for env vars
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                       – lint + type-check + tests on PR
│
├── app/
│   ├── globals.css
│   ├── layout.tsx                       – root layout (fonts, providers)
│   │
│   ├── (auth)/                          – unauthenticated routes
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── verify-email/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (onboarding)/                    – post-signup guided setup
│   │   ├── onboarding/
│   │   │   ├── connect-mailbox/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── upload-kb/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   └── configure/
│   │   │       ├── page.tsx
│   │   │       └── actions.ts
│   │   └── layout.tsx
│   │
│   ├── (app)/                           – authenticated app routes
│   │   ├── layout.tsx                   – app shell (sidebar, nav)
│   │   ├── inbox/
│   │   │   ├── page.tsx                 – RSC: inbox list (FR10–FR13)
│   │   │   ├── loading.tsx
│   │   │   └── [emailId]/
│   │   │       ├── page.tsx             – RSC: email detail + draft (FR16–FR22)
│   │   │       └── actions.ts           – validateDraft, rejectDraft, regenerateDraft, sendEmail
│   │   ├── knowledge-base/
│   │   │   ├── page.tsx                 – RSC: KB file list (FR24–FR26)
│   │   │   └── actions.ts               – uploadKbFile, deleteKbFile
│   │   └── settings/
│   │       ├── page.tsx                 – email connections + preferences (FR5–FR8, FR30)
│   │       └── actions.ts               – connectMailbox, disconnectMailbox, updatePreferences
│   │
│   └── auth/
│       └── callback/
│           └── route.ts                 – OAuth callback handler (Gmail, Outlook)
│
├── components/
│   ├── ui/                              – shadcn/ui primitives (auto-generated, never edit)
│   ├── inbox/
│   │   ├── inbox-list.tsx
│   │   ├── inbox-list.test.tsx
│   │   ├── email-row.tsx
│   │   ├── email-row.test.tsx
│   │   ├── inbox-filters.tsx            – category + priority filters (URL state)
│   │   └── inbox-realtime.tsx           – 'use client' Realtime subscription
│   ├── draft/
│   │   ├── draft-editor.tsx             – 'use client' Zustand-powered editor
│   │   ├── draft-editor.test.tsx
│   │   ├── confidence-badge.tsx         – Magic UI animated confidence score
│   │   └── draft-actions.tsx            – validate/reject/regenerate buttons
│   ├── kb/
│   │   ├── kb-upload-zone.tsx           – drag-and-drop upload
│   │   ├── kb-upload-zone.test.tsx
│   │   └── kb-file-list.tsx
│   ├── onboarding/
│   │   ├── onboarding-stepper.tsx       – Magic UI animated steps
│   │   └── mailbox-connect-form.tsx
│   └── shared/
│       ├── error-toast.tsx
│       ├── loading-skeleton.tsx         – Magic UI skeleton
│       └── sync-status-indicator.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                    – createServerClient
│   │   ├── client.ts                    – createBrowserClient
│   │   └── middleware.ts                – createMiddlewareClient
│   ├── ai/
│   │   ├── llm.ts                       – LLM provider abstraction (OpenAI/Anthropic)
│   │   ├── throttle.ts                  – checkUserLlmQuota()
│   │   ├── triage.ts                    – email categorization + priority scoring
│   │   ├── draft.ts                     – RAG draft generation logic
│   │   └── embeddings.ts               – pgvector embedding generation
│   ├── email/
│   │   ├── gmail.ts                     – Gmail API adapter
│   │   ├── outlook.ts                   – Microsoft Graph adapter
│   │   ├── imap.ts                      – IMAP/SMTP adapter
│   │   └── types.ts                     – shared email types
│   └── utils.ts                         – shared utilities
│
├── stores/
│   ├── inbox-store.ts                   – Zustand: filters, active email
│   ├── draft-store.ts                   – Zustand: draft edit state, optimistic
│   └── kb-store.ts                      – Zustand: upload state, file list
│
├── types/
│   ├── database.ts                      – auto-generated Supabase types (supabase gen types)
│   ├── email.ts                         – EmailCategory, EmailMessage types
│   └── draft.ts                         – DraftStatus, Draft types
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_init_schema.sql          – extensions, RLS setup
│   │   ├── 002_email_connections.sql
│   │   ├── 003_drafts.sql
│   │   ├── 004_kb_files.sql
│   │   └── 005_embeddings_pgvector.sql
│   └── functions/
│       ├── sync-emails/
│       │   └── index.ts                 – pg_cron triggered: fetch + categorize emails
│       ├── generate-draft/
│       │   └── index.ts                 – RAG pipeline: embed query + LLM call
│       └── index-kb/
│           └── index.ts                 – parse CSV/Excel + generate embeddings
│
├── e2e/
│   ├── auth.spec.ts
│   ├── inbox.spec.ts
│   ├── draft.spec.ts
│   └── kb-upload.spec.ts
│
└── public/
    └── onboarding-video.mp4             – FR31: onboarding help video
```

### Architectural Boundaries

**API Boundaries:**
- `/app/auth/callback/route.ts` — only external-facing Route Handler; handles Gmail + Outlook OAuth redirects
- Supabase Edge Functions — isolated backend processes; no direct DB access from browser
- All mutations from UI go through Server Actions — no client-side fetch to internal APIs

**Component Boundaries:**
- RSC (Server Components): inbox list, email detail, KB list, settings — data fetching, no client state
- Client Components (`'use client'`): draft editor, inbox realtime listener, upload zone, filters — need browser APIs or state
- Zustand stores never imported in Server Components

**Service Boundaries:**
- `/lib/ai/` — all LLM logic; called only from Edge Functions and Server Actions, never from Client Components
- `/lib/email/` — email provider adapters; called only from Edge Functions
- `/lib/supabase/server.ts` — used in Server Components and Server Actions only

**Data Boundaries:**
- Emails: never written to DB; read on-demand from provider API via `/lib/email/` adapters
- KB files: stored in Supabase Storage (encrypted); metadata in `kb_files` table
- Embeddings: stored in `embeddings` table with pgvector; scoped by `user_id` with RLS
- OAuth tokens: stored in Supabase Vault; accessed only by Edge Functions

### Requirements to Structure Mapping

| FR Group | Primary Location |
|---|---|
| FR1–4 (Auth) | `/app/(auth)/` + Supabase Auth |
| FR5–9 (Email connections) | `/app/(app)/settings/actions.ts` + `/lib/email/` + `/supabase/functions/sync-emails/` |
| FR10–15 (Inbox/Triage) | `/app/(app)/inbox/page.tsx` + `/components/inbox/` + `/lib/ai/triage.ts` |
| FR16–23 (Draft generation) | `/app/(app)/inbox/[emailId]/` + `/supabase/functions/generate-draft/` + `/lib/ai/draft.ts` |
| FR24–28 (Knowledge base) | `/app/(app)/knowledge-base/` + `/supabase/functions/index-kb/` + `/lib/ai/embeddings.ts` |
| FR29–31 (Onboarding) | `/app/(onboarding)/` + `/components/onboarding/` |
| FR32–34 (Security) | `middleware.ts` + all Supabase migrations (RLS) + Supabase Vault |

### Integration Points

**Internal Communication:**
- UI → Server Actions → Supabase DB (mutations)
- UI → RSC → Supabase DB (reads, via server client)
- UI ← Supabase Realtime (live inbox/draft updates)
- Server Actions → Supabase Storage (KB file upload)
- Edge Functions → `/lib/ai/` → LLM API (draft generation)
- Edge Functions → `/lib/email/` → Gmail/Outlook/IMAP APIs (sync)

**External Integrations:**
- Gmail API (OAuth 2.0) — `/lib/email/gmail.ts`
- Microsoft Graph API (OAuth 2.0) — `/lib/email/outlook.ts`
- IMAP/SMTP — `/lib/email/imap.ts`
- LLM API (OpenAI or Anthropic) — `/lib/ai/llm.ts` (abstracted, provider-switchable)

**Data Flow — Email → Draft:**
```
pg_cron (every 5min)
  → Edge Function: sync-emails
    → /lib/email/{provider}.ts → fetch new emails
    → /lib/ai/triage.ts → categorize + rank
    → Insert email metadata to DB (no content stored)
    → Trigger Edge Function: generate-draft per email
      → /lib/ai/embeddings.ts → embed email content
      → pgvector similarity search → relevant KB chunks
      → /lib/ai/llm.ts → generate draft with KB context
      → Insert draft to DB (status: ready)
      → Supabase Realtime → push update to client
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible. Next.js 16 App Router + @supabase/ssr is the officially supported combination. Supabase pgvector RLS applies automatically. Supabase Vault is accessible from Edge Functions via service role. Zustand is scoped to Client Components only — no RSC conflicts. Magic UI shares the same Tailwind + Radix UI base as shadcn/ui.

**Pattern Consistency:**
Naming conventions (snake_case DB, camelCase TS, kebab-case routes) are consistent and non-overlapping. Server Actions / Route Handlers split is coherent. Zustand store-per-domain aligns with the feature-based component structure.

**Structure Alignment:**
Project structure maps directly to architectural decisions. All Edge Functions correspond to async pipeline jobs. All Server Actions are co-located with their pages. Supabase clients are centralized in `/lib/supabase/`.

### Requirements Coverage Validation ✅

**Functional Requirements:** 34/34 FRs covered.
All FR groups (auth, email connections, inbox/triage, draft generation, knowledge base, onboarding, security) have explicit architectural support and mapped file locations.

**Non-Functional Requirements:** All NFRs addressed.
- Performance SLAs met by async pre-generation pipeline and RSC architecture
- Security requirements covered by RLS, Vault, server-side-only LLM, no email persistence
- GDPR covered by Vercel EU region (Frankfurt) and Supabase data deletion support
- Scalability (50 DAU V1) well within stack limits

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with rationale and migration paths. LLM provider is abstracted and switchable. Stack migration paths (pgvector → external, pg_cron → BullMQ) are documented for post-V1.

**Structure Completeness:** Complete directory tree defined. Every FR mapped to a specific file or directory. All Edge Functions, Server Actions, and component boundaries specified.

**Pattern Completeness:** 8 enforcement rules defined. Strict enums for DraftStatus and EmailCategory prevent free-string drift. Error handling, loading states, and async pipeline status conventions all specified.

### Gap Analysis Results

**Critical Gaps:** None.

**Minor Gaps (non-blocking):**
1. OAuth token refresh strategy (Gmail/Outlook 1-hour expiry) — to be specified in the email connection implementation story.
2. Detailed DB table schemas — intentionally deferred to implementation stories; migration filenames provide structural guidance.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium, 50 DAU V1)
- [x] Technical constraints identified (Gmail OAuth timeline, email non-persistence, GDPR)
- [x] Cross-cutting concerns mapped (async processing, data isolation, observability, error handling, cost management)

**✅ Architectural Decisions**
- [x] Critical decisions documented (pgvector, pg_cron, Supabase Vault, Server Actions/Route Handlers split, Realtime)
- [x] Technology stack fully specified (Next.js 16, Supabase, Vercel EU)
- [x] Integration patterns defined (Gmail, Outlook, IMAP, LLM abstraction)
- [x] Performance considerations addressed (async pipeline, draft caching, LLM throttling)

**✅ Implementation Patterns**
- [x] Naming conventions established (DB, TypeScript, routes)
- [x] Structure patterns defined (component organization, test co-location, Supabase clients)
- [x] Communication patterns specified (Realtime channels, Zustand stores)
- [x] Process patterns documented (error handling, loading states, async status, LLM quota)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established (RSC vs Client Components)
- [x] Integration points mapped (Edge Functions, Server Actions, Route Handlers)
- [x] Requirements to structure mapping complete (34 FRs mapped)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Stack is locked and battle-tested for this use case (Next.js + Supabase is the canonical SaaS stack)
- Async pipeline architecture correctly handles all performance SLAs without blocking UI
- Security model is comprehensive and enforced at the DB layer (RLS), not just application layer
- Clear migration paths documented for post-V1 scaling needs
- All 34 FRs have explicit file-level mapping — no ambiguity for implementation agents

**Areas for Future Enhancement:**
- OAuth token refresh handling (detail in story)
- Inngest or BullMQ migration when pg_cron reliability becomes a constraint
- pgvector → dedicated vector DB if KB size or query latency requires it
- CI pipeline expansion (Playwright e2e in CI, coverage thresholds)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — no new top-level directories without architectural justification
- Refer to this document for all architectural questions before making independent decisions
- Enforcement rules in "Implementation Patterns" section are mandatory, not suggestions

**First Implementation Priority:**
```bash
npx create-next-app --example with-supabase mail-agent
```
Then: DB schema migrations + RLS policies before any feature work begins.
