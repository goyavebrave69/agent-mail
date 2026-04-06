---
validationTarget: '_bmad-output/planning-artifacts/prd.md'
validationDate: '2026-04-06'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief.md
validationStepsCompleted:
  - step-v-01-discovery
  - step-v-02-format-detection
  - step-v-03-density-validation
  - step-v-04-brief-coverage-validation
  - step-v-05-measurability-validation
  - step-v-06-traceability-validation
  - step-v-07-implementation-leakage-validation
  - step-v-08-domain-compliance-validation
  - step-v-09-project-type-validation
  - step-v-10-smart-validation
  - step-v-11-holistic-quality-validation
  - step-v-12-completeness-validation
validationStatus: COMPLETE
holisticQualityRating: '3.5/5'
overallStatus: WARNING
---

# PRD Validation Report

**PRD Being Validated:** `_bmad-output/planning-artifacts/prd.md`
**Validation Date:** 2026-04-06

## Input Documents

- **PRD:** `_bmad-output/planning-artifacts/prd.md` ✓
- **Product Brief:** `_bmad-output/planning-artifacts/product-brief.md` ✓

## Validation Findings

## Format Detection

**PRD Structure (all ## Level 2 headers):**
1. Executive Summary
2. Project Classification
3. Success Criteria
4. User Journeys
5. Innovation Analysis
6. Product Scope
7. Domain Requirements
8. Project-Type Requirements
9. Functional Requirements
10. Non-Functional Requirements

**BMAD Core Sections Present:**
- Executive Summary: Present ✓
- Success Criteria: Present ✓
- Product Scope: Present ✓
- User Journeys: Present ✓
- Functional Requirements: Present ✓
- Non-Functional Requirements: Present ✓

**Format Classification:** BMAD Standard
**Core Sections Present:** 6/6

## Information Density Validation

**Anti-Pattern Violations:**

**Conversational Filler:** 1 occurrence
- Line 35: `"so users feel at home immediately"` (minor — acceptable in UX narrative context)

**Wordy Phrases:** 0 occurrences

**Redundant Phrases:** 0 occurrences

**Total Violations:** 1

**Severity Assessment:** Pass

**Recommendation:** PRD demonstrates good information density with minimal violations. The single filler phrase is in a UX narrative context and is borderline acceptable.

## Product Brief Coverage

**Product Brief:** `product-brief.md`

### Coverage Map

**Vision Statement:** Partially Covered ⚠️
- Brief vision: background auto-generation + triage + KB grounding ("near-automated workflow")
- PRD intentionally pivots to on-demand/composer-first. The edit history confirms this is deliberate.
- However, this pivot creates internal FR inconsistencies (see Critical Gaps below).

**Target Users:** Fully Covered ✓
- Thomas (B2B sales rep, 40–60 emails/day), Sophie (SME owner) both present. Volume quantified.

**Problem Statement:** Partially Covered ⚠️ (Moderate)
- The brief has an explicit Problem Statement section (3 costly activities: sorting, drafting, context switching).
- The PRD addresses it implicitly via the Executive Summary but has no dedicated "Problem" section.

**Key Features:** Partially Covered — 2 Critical Inconsistencies ❌

| Feature | Brief | PRD FRs | PRD Scope Section |
|---|---|---|---|
| Email sync | V1 | FR5-FR9 ✓ | ✓ |
| Auto-categorization | V1 | FR10-FR11 ✓ | ✓ |
| AI draft generation | V1 (background) | FR16, FR23 (background!) | ❌ Explicitly excluded |
| Confidence scoring | V1 | FR17 ✓ | ❌ Explicitly excluded |
| Draft editor | V1 | FR20 ✓ | ✓ |
| On-demand AI | Not in brief | MVP table ✓ | ✓ |

**Goals/Objectives:** Fully Covered ✓
- Time-to-process, draft acceptance rate, DAU targets all present.

**Differentiators:** Fully Covered ✓
- Innovation Analysis section directly addresses competitive gap.

### Coverage Summary

**Overall Coverage:** ~75% — good breadth, two critical internal inconsistencies

**Critical Gaps: 2**
1. **FR23 vs Scope conflict:** FR23 states "The system generates drafts asynchronously at sync time, not on demand" — but the PRD scope section explicitly lists "background draft generation at sync time" as **out of V1 scope**. Direct contradiction.
2. **FR17 vs Scope conflict:** FR17 states "The system displays a confidence score for each generated draft" — but the PRD scope section explicitly lists "confidence scoring" as **out of V1 scope**. Direct contradiction.

**Moderate Gaps: 1**
1. No explicit Problem Statement section in PRD (problem is implicit in Executive Summary).

**Informational Gaps: 0**

**Recommendation:** PRD requires revision to resolve the two critical FR/scope contradictions. FR23 and FR17 appear to be stale requirements from the pre-pivot draft that were not updated when the vision was reframed.

## Measurability Validation

### Functional Requirements

**Total FRs Analyzed:** 34

**Subjective Adjectives Found:** 1
- FR3: "A user can log in and log out **securely**" — "securely" is unmeasurable; should specify the security mechanism as a capability (e.g., "A user can log in and log out; sessions expire after inactivity")

**Vague Quantifiers Found:** 1
- FR9: "syncs new emails... at **regular intervals**" — should specify interval (e.g., "every 5 minutes")

**Implementation Leakage:** 2
- FR23: "asynchronously at sync time" — describes timing mechanism, not capability
- FR33: "read on-demand via provider APIs" — "via provider APIs" is implementation detail

**FR Violations Total:** 4

### Non-Functional Requirements

**Total NFRs Analyzed:** ~20 items across 5 categories

**Missing Metrics / Measurement Methods:** 5
- All Performance NFRs lack measurement method (e.g., "within 2 minutes of receipt" — measured how? APM? Alerting? Manual?)

**Incomplete / Vague NFRs:** 4
- Scalability: "without degradation" — which metric is maintained at 50 DAU?
- Scalability: "without blocking" — no latency budget for concurrent generation
- Scalability: "prevent cost spikes" — no throttle limit specified
- Reliability: "handled gracefully" — subjective; should specify error UX behavior (e.g., "displays error message with retry button within 3 seconds")

**Implementation Leakage in NFRs:** 10
- Security: "Supabase Storage", "browser localStorage", "Row-Level Security (RLS)", "LLM API calls server-side", "OAuth tokens server-side"
- Integration: "OAuth 2.0 scopes (read, send, label)", "ports 993/465", "Supabase Realtime", "WebSocket", "LLM provider API abstracted"
- Note: Integration section reads as an implementation spec rather than capability constraints.

**NFR Violations Total:** 19

### Overall Assessment

**Total Requirements:** 54 (34 FR + ~20 NFR items)
**Total Violations:** 23 (4 FR + 19 NFR)

**Severity:** Critical (>10 violations)

**Recommendation:** NFRs require significant revision. Performance NFRs need measurement methods. The Integration section should be moved to Architecture (it describes implementation choices, not quality attributes). Security NFRs should be reframed as capabilities/constraints without naming specific technologies.

## Traceability Validation

### Chain Validation

**Executive Summary → Success Criteria:** Intact ✓
- "Composer-first, one-click AI" ↔ "generate reply in one click, stay in inbox view" ✓
- "Three-generation limit" ↔ "limit clear and rarely blocks" ✓
- "Familiar Outlook/Gmail-like layout" ↔ "interface familiar without training" ✓

**Success Criteria → User Journeys:** Intact ✓
- "<30 min inbox processing" ↔ Thomas journey ✓
- "One-click reply generation" ↔ Thomas journey ✓
- "70% AI-assisted replies with light edits" ↔ Thomas + Sophie journeys ✓
- Technical success criteria (uptime, sync latency) have no journey coverage — acceptable for tech/security metrics.

**User Journeys → Functional Requirements:** Gaps Identified ❌

| Journey Requirement | Expected FR | Status |
|---|---|---|
| Reply composer with textarea | — | Missing FR |
| AI wand button / on-demand trigger | — | Missing FR |
| Delete email action | — | Missing FR |
| Quote confirmation pop-in (Sophie) | — | Missing FR |
| Three-generation limit enforcement | — | Missing FR |
| Send action | FR15 covers archive/read only | Partially covered |

**Scope → FR Alignment:** Misaligned ❌

MVP scope items without backing FRs:
1. "Reply composer with textarea and AI wand button" — no FR
2. "Visible actions: Send, Archive, Delete" — only archive/read in FR15
3. "Quote confirmation pop-in" — no FR
4. "On-demand AI reply generation" — FR16/FR23 describe background generation (stale)
5. "Three-generation limit per email" — no FR

### Orphan Elements

**Orphan Functional Requirements: 2**
- FR17: Confidence score — not in any journey AND excluded from scope
- FR23: "asynchronously at sync time" — conflicts with on-demand model, stale

**Unsupported Success Criteria:** 0 (technical criteria without journeys are acceptable)

**User Journeys Without Supporting FRs:** 1
- Core composer-first interaction (Thomas journey) lacks FRs for the reply composer, AI trigger, and delete action

### Traceability Matrix Summary

| Chain Link | Status | Issues |
|---|---|---|
| Exec Summary → Success Criteria | ✅ Intact | 0 |
| Success Criteria → User Journeys | ✅ Intact | 0 |
| User Journeys → FRs | ❌ Gaps | 5 missing FRs |
| Scope → FRs | ❌ Gaps | 5 scope items unbacked |

**Total Traceability Issues:** 7 (5 missing FRs + 2 orphan FRs)

**Severity:** Critical — core product features (composer, AI trigger, delete) lack FRs

**Recommendation:** 5 FRs must be added to cover the core composer-first UX: reply composer, on-demand AI trigger, email delete, quote confirmation, generation limit. FR17 and FR23 should be removed or updated to match the current on-demand model.

## Implementation Leakage Validation

### Leakage by Category (FR and NFR sections only)

**Frontend Frameworks:** 0 violations

**Backend Frameworks:** 0 violations

**Databases:** 1 violation
- Line 344 (NFR/Security): "Row-Level Security (RLS) at database level" — implementation mechanism; reframe as "Data is isolated per user account with zero cross-account access"

**Cloud Platforms:** 2 violations
- Line 342 (NFR/Security): "Supabase Storage" — reframe as "files stored encrypted at rest in cloud storage"
- Line 369 (NFR/Integration): "Supabase Realtime: live inbox updates" — reframe as "inbox updates delivered in real-time"

**Infrastructure:** 2 violations
- Line 346 (NFR/Security): "never in browser localStorage" — implementation detail; reframe as "OAuth tokens are never accessible to client-side code"
- Line 369 (NFR/Integration): "fallback to polling if WebSocket unavailable" — implementation fallback detail

**Other Implementation Details:** 3 violations
- Line 345 (NFR/Security): "LLM API calls server-side only" — reframe as "AI credentials are never exposed to end users"
- Line 368 (NFR/Integration): "LLM provider API: abstracted server-side to allow provider switching" — architecture decision, belongs in Architecture doc
- Lines 365-366 (NFR/Integration): "OAuth 2.0 scopes limited to minimum required (read, send, label)" — partially capability-relevant (principle of least privilege is a security requirement), but the specific scope names are implementation detail

**Note on FRs:** No violations. References to IMAP/SMTP (FR7), OAuth (FR5/FR6), and CSV/Excel (FR24) are capability-relevant — they describe what the system must support, not how to build it.

### Summary

**Total FR Implementation Leakage:** 0
**Total NFR Implementation Leakage:** 8
**Total Implementation Leakage Violations:** 8

**Severity:** Critical (>5 violations)

**Recommendation:** The Integration NFR subsection reads as an architecture spec (implementation choices, technology names, fallback strategies). It should be removed from the PRD and moved to the Architecture document. The Security NFR subsection needs reframing to describe security capabilities/constraints without naming specific technologies.

## Domain Compliance Validation

**Domain:** Productivity / AI-powered tools (B2B)
**Complexity:** Low (general/standard — not a regulated domain)
**Assessment:** No special domain compliance requirements (no Healthcare, Fintech, GovTech, etc.)

**Note:** MailAgent handles user emails and business documents (PII). The PRD includes a dedicated Domain Requirements section covering GDPR compliance, data privacy, and email provider constraints. This is appropriate for a B2B productivity SaaS and is well-documented.

## Project-Type Compliance Validation

**Project Type:** Web App SaaS (matched against `saas_b2b` + `web_app`)

### SaaS B2B Required Sections

| Section | Status | Notes |
|---|---|---|
| Tenant model | Present (partial) ✓ | Single-tenant V1 documented, multi-user V3 noted |
| RBAC matrix | Not present ⚠️ | "Single role = owner = admin = user" mentioned but no RBAC table |
| Subscription tiers | Intentionally excluded ✓ | Billing out of V1 scope — explicit decision |
| Integration list | Partially present ⚠️ | Gmail, Outlook, IMAP, LLM listed across sections but no consolidated integration table |
| Compliance requirements | Present ✓ | GDPR in Domain Requirements section |

### Web App Required Sections

| Section | Status | Notes |
|---|---|---|
| Browser matrix | Missing ❌ | No browser support listed (Chrome? Firefox? Safari? Edge?) |
| Responsive / desktop design | Present (partial) ✓ | "Desktop-first for V1" stated |
| Performance targets | Present ✓ | Performance NFRs with metrics |
| SEO strategy | N/A ✓ | Authenticated B2B app — SEO not applicable |
| Accessibility level | Missing ❌ | No WCAG level, keyboard nav, or screen reader requirements |

### Excluded Sections Check

- CLI interface: Absent ✓
- Mobile-first: Absent ✓ (desktop-first stated)
- Native features: Absent ✓
- CLI commands: Absent ✓

### Compliance Summary

**SaaS B2B Required:** 3/5 (1 missing, 1 partial, 1 intentionally excluded)
**Web App Required:** 3/5 (2 missing)
**Excluded Sections Present:** 0 ✓
**Compliance Score:** ~70%

**Severity:** Warning

**Recommendation:** Add browser support matrix (minimum: Chrome, Firefox, Edge latest 2 versions). Add accessibility requirement (minimum WCAG 2.1 AA for B2B SaaS). Consider a consolidated integration table. RBAC "single role V1" can stay as-is.

## SMART Requirements Validation

**Total Functional Requirements:** 34

### Scoring Summary

**All scores ≥ 3:** 91% (31/34)
**All scores ≥ 4:** ~79% (27/34)
**Overall Average Score:** ~4.4/5.0

### Scoring Table (S=Specific, M=Measurable, A=Attainable, R=Relevant, T=Traceable)

| FR | S | M | A | R | T | Avg | Flag |
|---|---|---|---|---|---|---|---|
| FR1 Create account | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR2 Email verification | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR3 Login/logout securely | 3 | 3 | 5 | 5 | 5 | 4.2 | |
| FR4 Delete account + data | 5 | 4 | 5 | 5 | 4 | 4.6 | |
| FR5 Connect Gmail via OAuth | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR6 Connect Outlook via OAuth | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR7 Connect IMAP/SMTP | 4 | 4 | 5 | 5 | 5 | 4.6 | |
| FR8 Disconnect mailbox | 5 | 5 | 5 | 5 | 4 | 4.8 | |
| FR9 Email sync at regular intervals | 3 | **2** | 5 | 5 | 5 | 4.0 | ❌ |
| FR10 Auto-categorize (6 categories) | 5 | 5 | 4 | 5 | 5 | 4.8 | |
| FR11 Priority ranking | 4 | 3 | 5 | 5 | 5 | 4.4 | |
| FR12 View inbox sorted by priority | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR13 Filter by category | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR14 Mark spam manually | 5 | 5 | 5 | 4 | 3 | 4.4 | |
| FR15 Mark read/archived | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR16 Generate draft per email (background) | 4 | 3 | 4 | 5 | 3 | 3.8 | |
| FR17 Display confidence score | 5 | 4 | 5 | 3 | **1** | 3.6 | ❌ |
| FR18 View generated draft | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR19 Validate and send draft (1 action) | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR20 Edit draft before sending | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR21 Request new draft with instruction | 5 | 4 | 5 | 5 | 4 | 4.6 | |
| FR22 Reject draft, compose own reply | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR23 Generate drafts async at sync time | 3 | 3 | 5 | **2** | **1** | 2.8 | ❌ |
| FR24 Upload CSV/Excel to KB | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR25 View KB file list | 5 | 5 | 5 | 5 | 4 | 4.8 | |
| FR26 Delete KB file | 5 | 5 | 5 | 5 | 4 | 4.8 | |
| FR27 Index uploaded files | 4 | 3 | 5 | 5 | 5 | 4.4 | |
| FR28 Re-index on file change | 5 | 5 | 5 | 5 | 4 | 4.8 | |
| FR29 Step-by-step onboarding flow | 5 | 4 | 5 | 5 | 5 | 4.8 | |
| FR30 Configure tone and language | 5 | 5 | 5 | 5 | 5 | 5.0 | |
| FR31 Access onboarding help video | 5 | 5 | 5 | 4 | 5 | 4.8 | |
| FR32 Full user data isolation | 5 | 4 | 5 | 5 | 4 | 4.6 | |
| FR33 Never store email content | 4 | 5 | 5 | 5 | 4 | 4.6 | |
| FR34 KB files encrypted at rest | 4 | 4 | 5 | 5 | 4 | 4.4 | |

**Legend:** 1=Poor, 3=Acceptable, 5=Excellent — ❌ = score < 3 in any category

### Improvement Suggestions

**FR9** (M=2): Specify sync interval — "The system syncs new emails from the connected mailbox automatically every 5 minutes"

**FR17** (T=1): Orphan requirement — excluded from V1 scope. Remove or move to Phase 2.

**FR23** (R=2, T=1): Stale requirement contradicting the composer-first model. Replace with: "A user can trigger AI draft generation on demand for any email in their inbox" (new on-demand FR).

### Overall Assessment

**Flagged FRs:** 3/34 = 8.8%
**Severity:** Pass (< 10% flagged)

**Recommendation:** Good FR quality overall. Three FRs need attention: FR9 (add sync interval), FR17 (remove or defer), FR23 (replace with on-demand trigger FR).

## Holistic Quality Assessment

### Document Flow & Coherence

**Assessment:** Good

**Strengths:**
- Compelling Executive Summary that clearly communicates the pivot to composer-first UX
- Strong, vivid user journeys (Thomas and Sophie) that ground abstract capabilities
- Logical section progression: vision → success → journeys → scope → requirements
- Clear "explicitly out of V1 scope" list — rare and very useful for downstream agents
- Innovation Analysis section adds strategic context beyond just requirements

**Areas for Improvement:**
- Significant incoherence: Executive Summary describes on-demand generation but FR16/FR23 still describe background generation — readers encounter contradictory mental models
- The Product Scope and NFR sections have duplicate/overlapping content (architecture described in both places)
- Domain Requirements mixes compliance requirements with third-party timeline constraints (different categories)

### Dual Audience Effectiveness

**For Humans:**
- Executive-friendly: Strong — vision, differentiators, and business success criteria are vivid and quantified
- Developer clarity: Moderate — FR contradictions create uncertainty about the actual model to build
- Designer clarity: Moderate — journeys describe UX but missing FRs for core UI components (composer, AI button)
- Stakeholder decision-making: Strong — what's in/out of scope is very explicit

**For LLMs:**
- Machine-readable structure: Good — consistent ## headers, FR numbering, tables throughout
- UX readiness: Moderate — journeys give context but core UX components not in FRs; UX agent would need to infer
- Architecture readiness: Good — Project-Type Requirements section explicitly names stack choices
- Epic/Story readiness: Moderate — FR contradictions would cause story generation confusion

**Dual Audience Score:** 3.5/5

### BMAD PRD Principles Compliance

| Principle | Status | Notes |
|---|---|---|
| Information Density | Met ✓ | Only 1 minor filler phrase; highly dense |
| Measurability | Partial ⚠️ | FRs mostly solid; NFRs lack measurement methods |
| Traceability | Partial ⚠️ | Vision→journeys chain intact; 5 missing FRs break journey→FR chain |
| Domain Awareness | Met ✓ | GDPR, data privacy, OAuth timelines all covered |
| Zero Anti-Patterns | Met ✓ | 1 mild filler; no significant anti-patterns |
| Dual Audience | Partial ⚠️ | Structure good; FR contradictions hurt LLM consumption accuracy |
| Markdown Format | Met ✓ | Clean ## structure, tables, consistent formatting |

**Principles Met:** 4/7 fully, 3/7 partial

### Overall Quality Rating

**Rating:** 3.5/5 — Good with targeted revisions required

**Rationale:** The PRD tells a compelling, differentiated story and most of its content is high quality. The vision is clear, the user journeys are vivid, and the majority of FRs are well-written. However, the document contains 2 critical internal contradictions (FR/scope conflicts) and 5 missing FRs for the core user-facing functionality — issues that would materially affect the quality of downstream UX, architecture, and story artifacts.

### Top 3 Improvements

1. **Resolve FR/scope contradictions (Critical)**
   - Remove or defer FR17 (confidence score — explicitly out of V1 scope)
   - Replace FR23 with on-demand trigger: "A user can trigger AI draft generation for any email; the system generates a contextual reply using the current thread and the user's knowledge base"
   - Update FR16 to align with on-demand model

2. **Add 5 missing FRs for core composer-first UX (Critical)**
   - "A user can compose a reply to any email using an in-place reply composer"
   - "A user can delete an email from their inbox"
   - "When an email appears to require a quote-oriented reply, the system asks the user for confirmation before generating that response type"
   - "A user is limited to 3 AI-generated drafts per email"
   - (FR for on-demand AI trigger — covered in improvement 1)

3. **Refactor the NFR section (Warning)**
   - Remove Integration subsection entirely — move content to Architecture document
   - Rewrite Security NFRs without technology names (no "Supabase Storage", "localStorage", "RLS")
   - Add measurement methods to all Performance NFRs (e.g., "as measured by application monitoring")

### Summary

**This PRD is:** A strategically compelling document with strong vision and user journeys, undermined by stale FRs from a prior model and missing core UX requirements.

**To make it great:** Fix the 2 FR/scope contradictions, add the 5 missing composer-UX FRs, and clean up the NFR section.

## Completeness Validation

### Template Completeness

**Template Variables Found:** 0
No template variables remaining ✓

### Content Completeness by Section

**Executive Summary:** Complete ✓
**Success Criteria:** Complete ✓ — all criteria have numeric targets
**Product Scope:** Complete ✓ — in-scope MVP table + explicit out-of-scope list + Phase 2/3 roadmap
**User Journeys:** Complete ✓ — 4 journeys (success, edge case, onboarding, recovery)
**Functional Requirements:** Incomplete ⚠️ — 5 missing FRs for core composer-first UX features (identified in step 6)
**Non-Functional Requirements:** Incomplete ⚠️ — implementation leakage in Security/Integration; missing measurement methods in Performance

### Section-Specific Completeness

**Success Criteria Measurability:** All measurable ✓ — numbers present throughout (DAU, %, latency, time)

**User Journeys Coverage:** Complete ✓ — covers primary B2B user (Thomas), edge case (Sophie), onboarding, recovery

**FRs Cover MVP Scope:** Partial ⚠️ — 5 scope items have no backing FR (reply composer, on-demand AI trigger, delete action, quote confirmation, generation limit)

**NFRs Have Specific Criteria:** Some ⚠️ — Performance good; Security/Integration lack measurement methods and mix in implementation details

### Frontmatter Completeness

**stepsCompleted:** Present ✓
**classification:** Present ✓ (domain, projectType, complexity, projectContext)
**inputDocuments:** Present ✓
**lastEdited / date:** Present ✓

**Frontmatter Completeness:** 4/4 ✓

### Completeness Summary

**Overall Completeness:** ~80% (4/6 sections complete, frontmatter complete)

**Critical Gaps:** 0 (no template variables, no sections entirely missing)
**Minor Gaps:** 2 (FRs partially incomplete, NFRs partially incomplete)

**Severity:** Warning

**Recommendation:** PRD is structurally complete with no missing sections. Address the FR gaps (5 missing) and NFR quality issues to reach full completeness.
