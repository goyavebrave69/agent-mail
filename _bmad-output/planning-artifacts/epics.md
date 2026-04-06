---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# MailAgent - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MailAgent, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A user can create an account with email and password
FR2: A user can verify their email address to activate their account
FR3: A user can log in and log out; sessions expire after a configurable inactivity period
FR4: A user can delete their account and all associated data
FR5: A user can connect a Gmail mailbox via OAuth
FR6: A user can connect an Outlook mailbox via OAuth
FR7: A user can connect any IMAP/SMTP mailbox with credentials
FR8: A user can disconnect a connected mailbox
FR9: The system syncs new emails from the connected mailbox automatically every 5 minutes
FR10: The system automatically categorizes each email into: quote request, inquiry, invoice, follow-up, spam, or other
FR11: The system assigns a priority ranking to each email based on category and content
FR12: A user can view their inbox sorted by priority
FR13: A user can filter their inbox by email category
FR14: A user can mark an email as spam manually
FR15: A user can mark an email as read or archived
FR16: A user can trigger AI draft generation on demand for any email; the system generates a contextual reply using the current email thread and the user's knowledge base as the sole source of factual data
FR17: A user can view an in-place reply composer alongside the email they are reading
FR18: A user can view the AI-generated draft in the reply composer
FR19: A user can validate and send a draft as-is with a single action
FR20: A user can edit a draft manually before sending
FR21: A user can request a new draft with an optional instruction; the system limits AI generation to 3 attempts per email
FR22: A user can reject a draft and compose their own reply from scratch
FR23: A user can delete an email from their inbox
FR24: When an incoming email is detected as a potential quote request, the system prompts the user for confirmation before generating a quote-oriented reply
FR25: A user can upload one or more CSV or Excel files as their knowledge base
FR26: A user can view the list of uploaded knowledge base files
FR27: A user can delete a knowledge base file
FR28: The system indexes uploaded files for use in AI draft generation
FR29: The system re-indexes the knowledge base when a file is added or removed
FR30: A new user is guided through a step-by-step onboarding flow (account creation → mailbox connection → knowledge base upload → configuration)
FR31: A user can configure their preferred reply tone (formal / informal) and language during onboarding
FR32: A user can access an onboarding help video at any time from the onboarding screen
FR33: Each user's emails, knowledge base files, and generated replies are fully isolated from other users
FR34: The system never stores user email content; emails are read on-demand from the connected mailbox provider
FR35: Knowledge base files are stored encrypted at rest

### NonFunctional Requirements

NFR1: Email sync latency — new emails appear in MailAgent within 2 minutes of receipt
NFR2: AI draft generation — draft available within 10 seconds of email sync completion (async, non-blocking)
NFR3: Knowledge base indexing — uploaded files fully indexed within 60 seconds
NFR4: UI responsiveness — all user actions complete within 1 second regardless of AI pipeline load
NFR5: Email send — confirmed as sent within 3 seconds of user validation
NFR6: All data transmitted over HTTPS/TLS
NFR7: Knowledge base files encrypted at rest (Supabase Storage)
NFR8: User email content never persisted — read on-demand via provider APIs only
NFR9: Row-Level Security (RLS) at database level — zero cross-account data access
NFR10: LLM API calls server-side only — no AI credentials exposed to the browser
NFR11: OAuth tokens stored server-side, never in browser localStorage
NFR12: GDPR — user data deletion on account close, privacy policy required at launch
NFR13: Supports 50 DAU at Month 3 without degradation
NFR14: AI job queue handles concurrent draft generation across all active users without blocking
NFR15: Per-user LLM call throttling prevents cost spikes
NFR16: Application uptime ≥ 99.5% during business hours (Mon–Fri, 8h–20h)
NFR17: Email sync failures retried automatically; user notified if sync is degraded
NFR18: IMAP fallback available if Gmail or Outlook APIs are unavailable
NFR19: Draft generation failures handled gracefully — error with retry option, never a blank state
NFR20: Gmail API OAuth 2.0 scopes limited to minimum required (read, send, label)
NFR21: Microsoft Graph API OAuth 2.0 with equivalent minimum scopes
NFR22: IMAP/SMTP standard ports (993/465) with TLS
NFR23: LLM provider API abstracted server-side to allow provider switching without frontend changes
NFR24: Supabase Realtime live inbox updates — fallback to polling if WebSocket unavailable

### Additional Requirements

- **Starter Template**: Use `npx create-next-app --example with-supabase mail-agent` as the project initialization command — this is Story 1 of Epic 1
- Database schema + RLS policies must be established before any feature work (tables: users, email_connections, drafts, kb_files, embeddings)
- Supabase Vault setup required for OAuth token storage before any email provider connection flow
- Supabase pgvector extension required for knowledge base vector embeddings
- pg_cron + Edge Functions for email sync scheduler (every 5 minutes per connected account)
- Supabase Edge Functions for async pipeline: sync-emails, generate-draft, index-kb
- Vercel EU region (Frankfurt) deployment for GDPR compliance
- GitHub Actions CI pipeline: lint + type-check + tests on PR
- Vitest (unit) + Playwright (e2e) testing framework to be added
- Gmail OAuth verification process must be initiated at project kickoff (4–8 week review timeline)
- Supabase Realtime channels: `inbox:{user_id}`, `drafts:{user_id}`, `kb:{user_id}`
- Zustand stores: one per domain — `useInboxStore`, `useDraftStore`, `useKbStore`
- All Server Actions co-located with page in `actions.ts` files
- Strict enums required: `DraftStatus` and `EmailCategory` — never free strings
- All async pipeline jobs must track status: `pending → generating → ready | error` with `error_message` and `retry_count`
- Centralized LLM quota check utility at `/lib/ai/throttle.ts` — called before every LLM call
- LLM provider abstracted in `/lib/ai/llm.ts` — switchable between OpenAI and Anthropic without frontend changes
- Magic UI used for high-impact moments: onboarding animations, confidence score display, loading states, inbox transitions

### UX Design Requirements

N/A — No UX Design document provided.

### FR Coverage Map

FR1: Epic 1 — User can create account with email + password
FR2: Epic 1 — User can verify email to activate account
FR3: Epic 1 — User can log in and log out securely
FR4: Epic 1 — User can delete account and all associated data
FR5: Epic 2 — User can connect Gmail via OAuth
FR6: Epic 2 — User can connect Outlook via OAuth
FR7: Epic 2 — User can connect IMAP/SMTP mailbox
FR8: Epic 2 — User can disconnect a connected mailbox
FR9: Epic 2 — System syncs new emails automatically every 5 minutes
FR10: Epic 4 — System auto-categorizes each email (quote, inquiry, invoice, follow-up, spam, other)
FR11: Epic 4 — System assigns priority ranking to each email
FR12: Epic 4 — User views inbox sorted by priority
FR13: Epic 4 — User filters inbox by email category
FR14: Epic 4 — User marks email as spam manually
FR15: Epic 4 — User marks email as read or archived
FR16: Epic 5 — User triggers AI draft generation on demand (Story 5.7)
FR17: Epic 5 — User views in-place reply composer alongside the email they are reading (Story 5.12)
FR18: Epic 5 — User views AI-generated draft in the reply composer (Story 5.2)
FR19: Epic 5 — User validates and sends draft with a single action (Story 5.3)
FR20: Epic 5 — User edits draft manually before sending (Story 5.4)
FR21: Epic 5 — User requests new draft with optional instruction; max 3 attempts (Story 5.5)
FR22: Epic 5 — User rejects draft and composes own reply (Story 5.6)
FR23: Epic 5 — User deletes an email from their inbox (Story 5.11)
FR24: Epic 5 — System prompts user for confirmation before generating quote-oriented reply (Story 5.13 — needed)
FR25: Epic 3 — User uploads CSV or Excel files as knowledge base
FR26: Epic 3 — User views list of uploaded KB files
FR27: Epic 3 — User deletes a KB file
FR28: Epic 3 — System indexes uploaded files for AI draft generation
FR29: Epic 3 — System re-indexes KB when file is added or removed
FR30: Epic 6 — New user guided through step-by-step onboarding flow
FR31: Epic 6 — User configures reply tone and language during onboarding
FR32: Epic 6 — User accesses onboarding help video at any time
FR33: Epic 1 — Each user's data is fully isolated from other users
FR34: Epic 1 — System never stores user email content
FR35: Epic 1 — Knowledge base files stored encrypted at rest

## Epic List

### Epic 1: Foundation & User Authentication
Users can create an account, verify their email, log in and out, and delete their account. The system is production-ready with full security baseline (RLS, encrypted storage, no email persistence) and CI/CD pipeline.
**FRs covered:** FR1, FR2, FR3, FR4, FR33, FR34, FR35
**Architecture:** Project init (`create-next-app --example with-supabase`), DB schema + RLS migrations, Supabase Vault, GitHub Actions CI

### Epic 2: Email Mailbox Connection & Sync
Users can connect their Gmail, Outlook, or IMAP mailbox via a guided OAuth flow. The system automatically syncs new emails every 5 minutes in the background.
**FRs covered:** FR5, FR6, FR7, FR8, FR9
**Architecture:** Supabase Vault (OAuth tokens), pg_cron scheduler, Edge Function sync-emails, /lib/email/ adapters

### Epic 3: Knowledge Base Management
Users can upload their business files (CSV/Excel), view and manage them, and the system automatically indexes them as vector embeddings to ground AI draft generation.
**FRs covered:** FR25, FR26, FR27, FR28, FR29
**Architecture:** Supabase Storage (encrypted), pgvector extension, Edge Function index-kb, /lib/ai/embeddings.ts

### Epic 4: Inbox Triage & Navigation
Users see their inbox automatically categorized and sorted by priority. They can filter by category, mark emails as spam, read, or archived.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15
**Architecture:** /lib/ai/triage.ts, Supabase Realtime (inbox:{user_id}), RSC inbox views, useInboxStore (Zustand)

### Epic 5: AI Draft Generation & Sending
Users can trigger AI draft generation on demand for any email. Drafts are grounded exclusively in their knowledge base. They can validate & send in one click, edit, regenerate with instructions, reject and write their own reply, or delete emails. An in-place composer is always accessible alongside the reading pane.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24 (Story 5.13 — needed)
**Architecture:** Edge Function generate-draft, RAG pipeline (/lib/ai/draft.ts + embeddings.ts), Supabase Realtime (drafts:{user_id}), useDraftStore (Zustand)

### Epic 6: Guided Onboarding Experience
New users are guided step-by-step through the full setup (account → mailbox → KB upload → configuration). They configure reply tone and language, and can access a help video at any time.
**FRs covered:** FR30, FR31, FR32
**Architecture:** /app/(onboarding)/ route group, onboarding-stepper (Magic UI), /public/onboarding-video.mp4

---

## Epic 1: Foundation & User Authentication

Users can create an account, verify their email, log in and out, and delete their account. The system is production-ready with full security baseline (RLS, encrypted storage, no email persistence) and CI/CD pipeline.

### Story 1.1: Project Initialization & CI/CD Setup

As a developer,
I want the project bootstrapped with the official Next.js + Supabase starter and CI pipeline configured,
So that the team can start building on a stable, production-ready foundation with automated quality gates.

**Acceptance Criteria:**

**Given** the developer runs `npx create-next-app --example with-supabase mail-agent`
**When** the setup completes
**Then** the project runs locally with Supabase Auth working end-to-end
**And** Tailwind CSS + shadcn/ui + Magic UI are installed and rendering correctly
**And** TypeScript strict mode is enabled with no type errors

**Given** a pull request is opened on GitHub
**When** the CI pipeline runs
**Then** lint, type-check, and unit tests (Vitest) pass before merge is allowed

**Given** the project is deployed to Vercel (EU region — Frankfurt)
**Then** the preview URL is accessible and the Supabase connection is healthy

---

### Story 1.2: User Registration & Email Verification

As a new user,
I want to create an account with my email and password and verify my email,
So that I can access MailAgent securely with a confirmed identity.

**Acceptance Criteria:**

**Given** the user submits a valid email and password on the signup page
**When** the form is submitted
**Then** a Supabase user is created and a verification email is sent within 30 seconds
**And** the user sees a confirmation screen explaining they must verify their email

**Given** the user clicks the verification link in the email
**When** they are redirected to the app
**Then** their account is activated and they are redirected to the onboarding flow
**And** the `users` table RLS policy ensures this user can only access their own data

**Given** the user tries to sign up with an already-registered email
**When** the form is submitted
**Then** an appropriate error message is displayed without exposing that the email exists

---

### Story 1.3: User Login & Logout

As a registered user,
I want to log in with my email and password and log out securely,
So that I can access my account and protect it when I'm done.

**Acceptance Criteria:**

**Given** the user submits valid credentials on the login page
**When** the form is submitted
**Then** a Supabase session is created server-side and the user is redirected to the inbox
**And** the session token is never exposed in localStorage or browser-accessible storage

**Given** the user is logged in and clicks logout
**When** the action completes
**Then** the server-side session is invalidated and the user is redirected to the login page
**And** accessing any authenticated route redirects back to login

**Given** the user submits invalid credentials
**When** the form is submitted
**Then** an error message is displayed and no session is created

---

### Story 1.4: Account Deletion & GDPR Data Cleanup

As a user,
I want to permanently delete my account and all my associated data,
So that I have full control over my personal data in compliance with GDPR.

**Acceptance Criteria:**

**Given** the user navigates to account settings and requests account deletion
**When** they confirm the deletion (with a confirmation prompt)
**Then** their Supabase Auth user is deleted
**And** all their data (KB files, drafts metadata, email connections, preferences) is deleted from the database
**And** any files in Supabase Storage are deleted
**And** the user is logged out and redirected to the homepage

**Given** the deletion process fails partially
**When** an error occurs
**Then** the user is notified and support is contacted — no silent partial deletion

---

## Epic 2: Email Mailbox Connection & Sync

Users can connect their Gmail, Outlook, or IMAP mailbox via a guided OAuth flow. The system automatically syncs new emails every 5 minutes in the background.

### Story 2.1: Gmail Mailbox Connection via OAuth

As a user,
I want to connect my Gmail account via OAuth,
So that MailAgent can access my inbox securely without storing my password.

**Acceptance Criteria:**

**Given** the user clicks "Connect Gmail" in settings
**When** they complete the Google OAuth flow
**Then** their OAuth access and refresh tokens are stored in Supabase Vault (never plain DB columns)
**And** the email connection is recorded in the `email_connections` table with RLS applied
**And** the user sees a success confirmation with their connected email address

**Given** the user denies the OAuth permission
**When** they are redirected back
**Then** no connection is created and the user sees an appropriate message

**Given** the OAuth callback route receives the authorization code
**When** it processes the response
**Then** only the minimum required scopes (read, send, label) are requested and confirmed

---

### Story 2.2: Outlook Mailbox Connection via OAuth

As a user,
I want to connect my Outlook/Microsoft 365 mailbox via OAuth,
So that MailAgent can access my inbox with the same security guarantees as Gmail.

**Acceptance Criteria:**

**Given** the user clicks "Connect Outlook" in settings
**When** they complete the Microsoft OAuth flow
**Then** their tokens are stored in Supabase Vault and the connection recorded with RLS
**And** the user sees a success confirmation with their connected email address

**Given** the Microsoft OAuth flow fails
**When** the user is redirected back
**Then** no connection is created and the error is surfaced to the user with a retry option

---

### Story 2.3: IMAP/SMTP Mailbox Connection

As a user,
I want to connect any IMAP/SMTP mailbox using my credentials,
So that I can use MailAgent with any email provider (OVH, corporate SMTP, etc.).

**Acceptance Criteria:**

**Given** the user enters their IMAP server, port (993), username, and password
**When** they submit the connection form
**Then** MailAgent tests the connection using TLS on port 993
**And** if successful, the credentials are stored encrypted in Supabase Vault
**And** the connection is recorded and the user sees a confirmation

**Given** the IMAP credentials are incorrect or the server is unreachable
**When** the user submits
**Then** a clear error is displayed (invalid credentials vs. server unreachable) and no connection is saved

---

### Story 2.4: Mailbox Disconnection

As a user,
I want to disconnect a connected mailbox,
So that I can revoke MailAgent's access to my email at any time.

**Acceptance Criteria:**

**Given** the user clicks "Disconnect" on a connected mailbox in settings
**When** they confirm the action
**Then** the OAuth tokens or IMAP credentials are deleted from Supabase Vault
**And** the `email_connections` record is deleted
**And** the email sync job for this account is deactivated
**And** the user sees confirmation that the mailbox has been disconnected

---

### Story 2.5: Automatic Email Sync

As a user,
I want my connected mailbox to be automatically synchronized every 5 minutes,
So that new emails appear in MailAgent within 2 minutes of receipt without any manual action.

**Acceptance Criteria:**

**Given** a user has a connected mailbox
**When** the pg_cron job triggers the sync-emails Edge Function
**Then** new emails are fetched from the provider API and their metadata is stored (no email content persisted)
**And** new email entries appear in the inbox within 2 minutes of receipt (NFR1)

**Given** the email sync fails (API error, token expiry)
**When** the failure occurs
**Then** the sync is retried automatically
**And** if retries are exhausted, the user is notified via the sync-status indicator (never a silent failure)

**Given** the user has no connected mailbox
**When** the cron job runs
**Then** no sync is attempted and no error is raised

---

## Epic 3: Knowledge Base Management

Users can upload their business files (CSV/Excel), view and manage them, and the system automatically indexes them as vector embeddings to ground AI draft generation.

### Story 3.1: Knowledge Base File Upload

As a user,
I want to upload CSV or Excel files as my knowledge base via drag-and-drop,
So that the AI can use my business data (prices, availability, policies) to generate accurate draft replies.

**Acceptance Criteria:**

**Given** the user drags a CSV or Excel file onto the upload zone (or clicks to browse)
**When** the file is submitted
**Then** the file is uploaded to Supabase Storage encrypted at rest
**And** a record is created in the `kb_files` table with status `pending` and RLS applied
**And** the user sees an upload progress indicator and then an "Indexing…" status

**Given** the user uploads a file of an unsupported format
**When** the upload is attempted
**Then** an error message specifies the issue and no file is stored

**Given** multiple files are uploaded
**When** each upload completes
**Then** each file is independently tracked with its own status

---

### Story 3.2: Knowledge Base Indexing Pipeline

As a user,
I want my uploaded files to be automatically indexed within 60 seconds,
So that the AI can immediately use my business data in newly generated drafts.

**Acceptance Criteria:**

**Given** a KB file record exists with status `pending`
**When** the index-kb Edge Function is triggered
**Then** the file is parsed (CSV columns or Excel rows extracted)
**And** embeddings are generated and stored in the `embeddings` table (pgvector) scoped by `user_id` with RLS
**And** the `kb_files` record status is updated to `ready` within 60 seconds (NFR3)

**Given** the indexing fails (malformed file, parsing error)
**When** the error occurs
**Then** the `kb_files` status is set to `error` with an `error_message`
**And** the user sees an actionable error in the KB file list

---

### Story 3.3: Knowledge Base File List & Status

As a user,
I want to view all my uploaded knowledge base files and their indexing status,
So that I can understand what data the AI has access to.

**Acceptance Criteria:**

**Given** the user navigates to the Knowledge Base page
**When** the page loads
**Then** all their KB files are listed with name, upload date, size, and status (pending / ready / error)
**And** only their own files are visible (RLS enforced)

**Given** a file has status `error`
**When** the user views the list
**Then** the error reason is displayed alongside a re-upload option

---

### Story 3.4: Knowledge Base File Deletion & Re-indexing

As a user,
I want to delete a knowledge base file,
So that I can remove outdated data and keep the AI grounded in current information.

**Acceptance Criteria:**

**Given** the user clicks "Delete" on a KB file and confirms
**When** the action executes
**Then** the file is removed from Supabase Storage
**And** the `kb_files` record is deleted
**And** all associated embeddings for that file are deleted from the `embeddings` table
**And** the knowledge base is re-indexed to reflect the removal (FR28)

**Given** the deletion fails
**When** an error occurs
**Then** the user is notified and the file remains in the list — no partial deletion

---

## Epic 4: Inbox Triage & Navigation

Users see their inbox automatically categorized and sorted by priority. They can filter by category, mark emails as spam, read, or archived.

### Story 4.1: Automatic Email Categorization & Priority Ranking

As a user,
I want each incoming email to be automatically categorized and assigned a priority rank,
So that I can instantly see what matters most without reading every email.

**Acceptance Criteria:**

**Given** a new email is fetched during sync
**When** the sync-emails Edge Function processes it
**Then** the email is categorized as one of: `quote`, `inquiry`, `invoice`, `follow_up`, `spam`, or `other` (strict enum — FR10)
**And** a priority rank is assigned based on category and content signals (FR11)
**And** the category and rank are stored in the email metadata record with RLS applied

**Given** the categorization LLM call fails
**When** the error occurs
**Then** the email is assigned category `other` and a default low priority — never a blank or broken state

---

### Story 4.2: Priority-Sorted Inbox View

As a user,
I want to view my inbox sorted by priority with category labels,
So that I can process the most urgent emails first.

**Acceptance Criteria:**

**Given** the user navigates to the inbox
**When** the page loads (RSC)
**Then** emails are displayed sorted by priority (highest first) with their category badge visible
**And** only the authenticated user's emails are shown (RLS enforced)
**And** a loading skeleton (Magic UI) is shown while data is fetching

**Given** new emails arrive while the user is viewing the inbox
**When** the Supabase Realtime `inbox:{user_id}` channel pushes an update
**Then** the inbox updates live without a full page reload
**And** a fallback polling every 30 seconds activates if the WebSocket is unavailable (NFR24)

---

### Story 4.3: Inbox Filtering by Category

As a user,
I want to filter my inbox by email category,
So that I can focus on one type of email at a time (e.g., only quotes).

**Acceptance Criteria:**

**Given** the user selects a category filter (e.g., "Quotes")
**When** the filter is applied
**Then** only emails matching that category are displayed
**And** the active filter is reflected in the URL (searchParams) so it persists on refresh

**Given** the user clears the filter
**When** the action executes
**Then** all emails are shown again sorted by priority

---

### Story 4.4: Manual Email Actions (Spam, Read, Archive)

As a user,
I want to manually mark emails as spam, read, or archived,
So that I can keep my inbox clean and organized.

**Acceptance Criteria:**

**Given** the user clicks "Mark as spam" on an email
**When** the Server Action executes
**Then** the email's category is updated to `spam` and it is removed from the main inbox view
**And** the change is reflected immediately via optimistic UI (Zustand)

**Given** the user marks an email as read
**When** the action executes
**Then** the email is marked read in the metadata and the unread indicator is removed

**Given** the user archives an email
**When** the action executes
**Then** the email is hidden from the default inbox view and accessible via an "Archived" filter

---

## Epic 5: AI Draft Generation & Sending

Users can trigger AI draft generation on demand for any email. Drafts are grounded exclusively in their knowledge base. They can validate & send in one click, edit, regenerate with instructions, reject and write their own reply, or delete emails. An in-place composer is always accessible alongside the reading pane.

### Story 5.1: Asynchronous Draft Generation Pipeline

As a developer,
I want a shared generate-draft Edge Function and async pipeline,
So that both on-demand (Story 5.7) and any future background triggers share the same generation logic.

**Acceptance Criteria:**

**Given** the generate-draft Edge Function is invoked with an emailId and userId
**When** it runs
**Then** the email content is embedded and a pgvector similarity search retrieves relevant KB chunks
**And** the LLM generates a draft grounded exclusively in those KB chunks (no hallucinated data)
**And** the draft record status transitions `pending → generating → ready` (or `error`) with `retry_count` tracked
**And** the draft is available within 10 seconds of invocation (NFR2)

**Given** the user's LLM quota is exceeded
**When** a draft generation is attempted
**Then** `checkUserLlmQuota(userId)` blocks the call and the draft status is set to `error` with a clear message

**Given** the generate-draft Edge Function fails
**When** the error occurs
**Then** the draft status is `error` with `error_message` populated — never a blank or missing state (NFR19)

---

### Story 5.2: Draft View in Reply Composer

As a user,
I want to see the AI-generated draft when I open an email,
So that I can immediately review and act on the suggested reply.

**Acceptance Criteria:**

**Given** the user opens an email that has a draft with status `ready`
**When** the email detail page loads (RSC)
**Then** the draft text is displayed in the reply composer
**And** the draft actions (validate, edit, regenerate, reject) are all visible

**Given** the draft status is `generating`
**When** the user opens the email
**Then** a loading state is shown and a Supabase Realtime subscription on `drafts:{user_id}` updates the UI when ready

**Given** the draft status is `error`
**When** the user opens the email
**Then** an error message with a retry button is displayed — never a blank draft area

---

### Story 5.3: Validate & Send Draft

As a user,
I want to validate and send a draft with a single click,
So that I can process emails in seconds without writing anything.

**Acceptance Criteria:**

**Given** the user clicks "Validate & Send" on a ready draft
**When** the Server Action executes
**Then** the email is sent via the connected provider API (Gmail/Outlook/IMAP)
**And** the send is confirmed within 3 seconds (NFR5)
**And** the draft status is updated to `sent`
**And** the email is removed from the active inbox view
**And** the UI updates optimistically via Zustand before server confirmation

**Given** the send fails (provider API error)
**When** the error occurs
**Then** the draft status remains `ready`, the error is surfaced with a retry option, and no duplicate send occurs

---

### Story 5.4: Edit Draft Before Sending

As a user,
I want to manually edit a draft before sending it,
So that I can correct or personalize the AI's reply when needed.

**Acceptance Criteria:**

**Given** the user modifies text in the draft editor (Client Component, Zustand-powered)
**When** they type
**Then** the edited content is tracked in `useDraftStore` without triggering a server call
**And** the "Send" button remains active on the edited content

**Given** the user clicks "Send" after editing
**When** the Server Action executes
**Then** the edited version is sent (not the original AI draft)
**And** the draft status is updated to `sent`

---

### Story 5.5: Regenerate Draft with Instruction

As a user,
I want to request a new draft with an optional instruction,
So that I can guide the AI when the first draft doesn't fit my needs.

**Acceptance Criteria:**

**Given** the user clicks "Regenerate" and optionally types an instruction (e.g., "offer a 24h delay")
**When** the regeneration Server Action is triggered
**Then** the existing draft is replaced with a new generation request (status → `generating`)
**And** the instruction is passed to the LLM as additional context alongside the KB chunks
**And** the new draft appears within 10 seconds (NFR2) and the confidence score is updated

**Given** the user clicks "Regenerate" without any instruction
**When** the action executes
**Then** a new draft is generated with the same KB context as the original

---

### Story 5.6: Reject Draft & Compose Own Reply

As a user,
I want to reject an AI draft and write my own reply from scratch,
So that I maintain full control when the AI cannot help.

**Acceptance Criteria:**

**Given** the user clicks "Reject" on a draft
**When** the action executes
**Then** the draft status is updated to `rejected`
**And** a blank compose area replaces the draft editor

**Given** the user writes their reply in the compose area and clicks "Send"
**When** the Server Action executes
**Then** the manually written email is sent via the connected provider API
**And** the email is marked as handled

---

### Story 5.7: Create Draft On Demand

As a user,
I want to manually create a draft when no draft exists yet,
So that I can trigger the AI reply workflow without waiting for background sync timing.

**Acceptance Criteria:**

**Given** an email detail page has no draft yet
**When** the user clicks `Create Draft`
**Then** a server action creates a draft row with status `generating`
**And** the `generate-draft` Edge Function is invoked asynchronously
**And** the UI immediately shows a generating state (optimistic) and then updates via Realtime when ready

**Given** the user clicks `Create Draft` multiple times quickly
**When** the first request is already in progress
**Then** duplicate generation is prevented
**And** the user sees a safe message instead of triggering a duplicate draft job

**Given** draft generation startup fails
**When** the Edge Function invocation returns an error
**Then** draft status is set to `error` with a helpful message
**And** the UI shows retry affordance using existing draft error-state behavior

---

### Story 5.8: Functional Inbox Search

As a user,
I want the inbox search bar to work reliably across visible emails,
So that I can quickly find messages by sender, subject, and content preview.

**Acceptance Criteria:**

**Given** the user types in the inbox search input
**When** search text changes
**Then** the email list updates in real time without page navigation
**And** results are filtered by sender name, sender email, subject, and body preview text

**Given** the search input is cleared
**When** the user deletes all text
**Then** the full unfiltered email list is restored

---

### Story 5.9: Collapsible Mail Navigation Sidebar

As a user,
I want the left mail navigation to be collapsible,
So that I can focus on the email list and reading pane when needed.

**Acceptance Criteria:**

**Given** the inbox shell is displayed
**When** the user toggles sidebar collapse
**Then** the left navigation collapses/expands smoothly without layout break
**And** the user's preference is preserved across page navigations within the session

---

### Story 5.10: Custom Category Management Modal

As a user,
I want a button that opens a modal to create custom email categories,
So that I can define my own sorting taxonomy beyond default categories.

**Acceptance Criteria:**

**Given** the user is in inbox shell
**When** they click `Manage Categories`
**Then** a modal opens and allows creating a custom category name
**And** the new category appears in the category filter list

---

### Story 5.11: Functional Mail Action Buttons

As a user,
I want Archive, Trash, Reply, and Forward action buttons to work on emails,
So that I can manage my inbox efficiently from the reading pane.

**Acceptance Criteria:**

**Given** the user clicks the `Trash` (delete) button on an email
**When** the Server Action executes
**Then** the email is removed from the inbox view
**And** the action is confirmed within 1 second (NFR4)

**Given** the user clicks the `Archive` button on an email
**When** the Server Action executes
**Then** the email is marked as archived and removed from the active inbox view

**Given** the user clicks `Reply` or `Forward`
**When** the action executes
**Then** the in-place composer opens pre-populated with the appropriate headers (To, Subject)

---

### Story 5.12: Manual Draft Button Next to Send

As a user,
I want a "Create Draft" button available in the composer at all times,
So that I can trigger AI draft generation directly from the reply area.

**Acceptance Criteria:**

**Given** the user has the reply composer open
**When** no draft has been generated yet
**Then** a `Create Draft` button is visible next to the Send button

**Given** the user clicks `Create Draft` from the composer
**When** the action executes
**Then** AI draft generation is triggered (same pipeline as Story 5.7)
**And** the generated draft is loaded into the composer when ready

---

## Epic 6: Guided Onboarding Experience

New users are guided step-by-step through the full setup (account → mailbox → KB upload → configuration). They configure reply tone and language, and can access a help video at any time.

### Story 6.1: Step-by-Step Onboarding Flow

As a new user,
I want to be guided through a step-by-step setup flow after creating my account,
So that I can configure MailAgent correctly without feeling lost.

**Acceptance Criteria:**

**Given** a user completes email verification for the first time
**When** they are redirected to the app
**Then** they land on the onboarding flow at `/onboarding/connect-mailbox`
**And** an animated stepper (Magic UI onboarding-stepper) shows the 3 steps: Connect mailbox → Upload knowledge base → Configure preferences
**And** authenticated users who have already completed onboarding are redirected directly to the inbox

**Given** the user completes each onboarding step
**When** they advance to the next
**Then** the stepper reflects their progress and they cannot skip ahead
**And** if they refresh mid-onboarding, they resume at the last incomplete step

**Given** the user completes all 3 onboarding steps
**When** the final step is submitted
**Then** they are redirected to the inbox with a welcome message
**And** the onboarding flow is no longer shown on subsequent logins

---

### Story 6.2: Reply Tone & Language Configuration

As a user,
I want to configure my preferred reply tone (formal/informal) and language during onboarding,
So that AI drafts match my communication style from the very first email.

**Acceptance Criteria:**

**Given** the user reaches the "Configure preferences" onboarding step
**When** the page loads
**Then** they are presented with a tone selector (Formal / Informal) and a language selector
**And** the selections are saved via a Server Action to their user profile in the database

**Given** the user completes onboarding and later wants to change their preferences
**When** they navigate to Settings
**Then** the same tone and language options are available and updatable

**Given** the user saves their preferences
**When** the next draft is generated
**Then** the LLM prompt includes the user's tone and language settings

---

### Story 6.3: Onboarding Help Video

As a new user,
I want to access a help video at any time during onboarding,
So that I can understand the product quickly if I'm confused.

**Acceptance Criteria:**

**Given** the user is on any onboarding screen
**When** they click "Watch help video"
**Then** the onboarding video (`/public/onboarding-video.mp4`) plays in a modal or inline player
**And** the video is accessible without leaving the onboarding flow

**Given** the video fails to load
**When** the error occurs
**Then** a fallback message with a support contact is shown — never a broken player
