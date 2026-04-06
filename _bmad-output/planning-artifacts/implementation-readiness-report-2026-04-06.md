---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
status: COMPLETE
documents:
  prd: '_bmad-output/planning-artifacts/prd.md'
  architecture: '_bmad-output/planning-artifacts/architecture.md'
  epics: '_bmad-output/planning-artifacts/epics.md'
  ux: null
status: IN_PROGRESS
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-06
**Project:** mail-agent

## Document Inventory

### PRD
- `_bmad-output/planning-artifacts/prd.md` ✓ (whole document)
- `_bmad-output/planning-artifacts/prd-validation-report.md` (validation report — reference only)

### Architecture
- `_bmad-output/planning-artifacts/architecture.md` ✓ (whole document)

### Epics & Stories
- `_bmad-output/planning-artifacts/epics.md` ✓ (whole document)

### UX Design
- ⚠️ Not found

---

## PRD Analysis

### Functional Requirements (35 total)

| # | Requirement |
|---|---|
| FR1 | A user can create an account with email and password |
| FR2 | A user can verify their email address to activate their account |
| FR3 | A user can log in and log out; sessions expire after a configurable inactivity period |
| FR4 | A user can delete their account and all associated data |
| FR5 | A user can connect a Gmail mailbox via OAuth |
| FR6 | A user can connect an Outlook mailbox via OAuth |
| FR7 | A user can connect any IMAP/SMTP mailbox with credentials |
| FR8 | A user can disconnect a connected mailbox |
| FR9 | The system syncs new emails from the connected mailbox automatically every 5 minutes |
| FR10 | The system automatically categorizes each email into: quote request, inquiry, invoice, follow-up, spam, or other |
| FR11 | The system assigns a priority ranking to each email based on category and content |
| FR12 | A user can view their inbox sorted by priority |
| FR13 | A user can filter their inbox by email category |
| FR14 | A user can mark an email as spam manually |
| FR15 | A user can mark an email as read or archived |
| FR16 | A user can trigger AI draft generation on demand for any email; the system generates a contextual reply using the current email thread and the user's knowledge base as the sole source of factual data |
| FR17 | A user can view an in-place reply composer alongside the email they are reading |
| FR18 | A user can view the AI-generated draft in the reply composer |
| FR19 | A user can validate and send a draft as-is with a single action |
| FR20 | A user can edit a draft manually before sending |
| FR21 | A user can request a new draft with an optional instruction; the system limits AI generation to 3 attempts per email |
| FR22 | A user can reject a draft and compose their own reply from scratch |
| FR23 | A user can delete an email from their inbox |
| FR24 | When an incoming email is detected as a potential quote request, the system prompts the user for confirmation before generating a quote-oriented reply |
| FR25 | A user can upload one or more CSV or Excel files as their knowledge base |
| FR26 | A user can view the list of uploaded knowledge base files |
| FR27 | A user can delete a knowledge base file |
| FR28 | The system indexes uploaded files for use in AI draft generation |
| FR29 | The system re-indexes the knowledge base when a file is added or removed |
| FR30 | A new user is guided through a step-by-step onboarding flow (account creation → mailbox connection → knowledge base upload → configuration) |
| FR31 | A user can configure their preferred reply tone (formal / informal) and language during onboarding |
| FR32 | A user can access an onboarding help video at any time from the onboarding screen |
| FR33 | Each user's emails, knowledge base files, and generated replies are fully isolated from other users |
| FR34 | The system never stores user email content; emails are read on-demand from the connected mailbox provider |
| FR35 | Knowledge base files are stored encrypted at rest |

### Non-Functional Requirements

**Performance:** Email sync ≤2 min | AI generation ≤10 sec | KB indexing ≤60 sec | UI actions ≤1 sec | Email send confirm ≤3 sec
**Security:** HTTPS/TLS | encrypted KB at rest | no email persistence | per-account isolation | AI credentials server-side | auth tokens client-inaccessible | GDPR deletion ≤30 days
**Scalability:** 50 DAU Month 3 | concurrent queue ≤30s wait | 20 gen/user/hour | schema supports future multi-user
**Reliability:** 99.5% uptime business hours | sync retry ×3 + banner | IMAP fallback | AI failure → error+retry ≤3s

### Additional Constraints

- Browser: Chrome, Firefox, Edge (latest 2 versions), Safari (latest)
- Accessibility: WCAG 2.1 AA
- Desktop viewport minimum 1280px

### PRD Completeness Assessment

PRD is well-structured (BMAD Standard, 6/6 core sections). All 35 FRs are clear, on-demand model is consistent throughout. NFRs are measurable with methods specified.

---

## Epic Coverage Validation

### Coverage Matrix

| New FR | Summary | Epic Coverage | Status |
|---|---|---|---|
| FR1 | Create account | Epic 1 | ✅ Covered |
| FR2 | Email verification | Epic 1 | ✅ Covered |
| FR3 | Login/logout + session expiry | Epic 1 (Story 1.3) | ✅ Covered |
| FR4 | Delete account + data | Epic 1 (Story 1.4) | ✅ Covered |
| FR5 | Connect Gmail OAuth | Epic 2 (Story 2.1) | ✅ Covered |
| FR6 | Connect Outlook OAuth | Epic 2 (Story 2.2) | ✅ Covered |
| FR7 | Connect IMAP/SMTP | Epic 2 (Story 2.3) | ✅ Covered |
| FR8 | Disconnect mailbox | Epic 2 (Story 2.4) | ✅ Covered |
| FR9 | Sync every 5 min | Epic 2 (Story 2.5) | ✅ Covered |
| FR10 | Auto-categorize (6 categories) | Epic 4 (Story 4.1) | ✅ Covered |
| FR11 | Priority ranking | Epic 4 (Story 4.1) | ✅ Covered |
| FR12 | View inbox sorted by priority | Epic 4 (Story 4.2) | ✅ Covered |
| FR13 | Filter by category | Epic 4 (Story 4.3) | ✅ Covered |
| FR14 | Mark spam manually | Epic 4 (Story 4.4) | ✅ Covered |
| FR15 | Mark read/archived | Epic 4 (Story 4.4) | ✅ Covered |
| FR16 | **On-demand AI trigger** | Epic 5 — **MODEL CONFLICT** | ❌ CONFLICT |
| FR17 | **In-place reply composer** | Not found in any epic | ❌ MISSING |
| FR18 | View AI draft in composer | Epic 5 (Story 5.2) | ✅ Covered |
| FR19 | Validate & send in 1 action | Epic 5 (Story 5.3) | ✅ Covered |
| FR20 | Edit draft manually | Epic 5 (Story 5.4) | ✅ Covered |
| FR21 | Request new draft; **3-attempt limit** | Epic 5 (Story 5.5) — limit not mentioned | ⚠️ Partial |
| FR22 | Reject draft, compose own reply | Epic 5 (Story 5.6) | ✅ Covered |
| FR23 | **Delete email** | Not found in any epic | ❌ MISSING |
| FR24 | **Quote confirmation pop-in** | Not found in any epic | ❌ MISSING |
| FR25 | Upload CSV/Excel to KB | Epic 3 (Story 3.1) | ✅ Covered |
| FR26 | View KB file list | Epic 3 (Story 3.3) | ✅ Covered |
| FR27 | Delete KB file | Epic 3 (Story 3.4) | ✅ Covered |
| FR28 | Index uploaded files | Epic 3 (Story 3.2) | ✅ Covered |
| FR29 | Re-index on file change | Epic 3 (Story 3.4) | ✅ Covered |
| FR30 | Step-by-step onboarding | Epic 6 (Story 6.1) | ✅ Covered |
| FR31 | Configure tone + language | Epic 6 (Story 6.2) | ✅ Covered |
| FR32 | Onboarding help video | Epic 6 (Story 6.3) | ✅ Covered |
| FR33 | User data isolation | Epic 1 | ✅ Covered |
| FR34 | No email content stored | Epic 1 | ✅ Covered |
| FR35 | KB encrypted at rest | Epic 1 | ✅ Covered |

### Missing & Conflicted Requirements

#### ❌ Critical — FR16 MODEL CONFLICT
**New PRD (FR16):** "A user can trigger AI draft generation **on demand**"
**Epic 5 current design:** Background generation at sync time (Story 5.1: "Asynchronous Draft Generation Pipeline — drafts ready and waiting when I open an email")

Epic 5 is entirely designed around the OLD background model. All 6 stories (5.1–5.6) must be reviewed and revised to reflect the on-demand composer-first model. This is the most significant gap.

**Note:** Epic 5 still references confidence scores (Stories 5.1, 5.2) which are now explicitly out of V1 scope in the updated PRD.

#### ❌ Missing — FR17: In-place reply composer
No story covers the reply composer UI (the textarea alongside the email reading pane). This is a core UX element that needs a dedicated story or integration into an existing Epic 4/5 story.

#### ❌ Missing — FR23: Delete email
No story covers email deletion from inbox. Recommend adding to Epic 4 (Story 4.4 or new Story 4.5).

#### ❌ Missing — FR24: Quote confirmation pop-in
No story covers the confirmation flow when a quote request is detected. Recommend adding to Epic 5 (new Story 5.X).

#### ⚠️ Partial — FR21: 3-generation limit
Story 5.5 (Regenerate Draft) covers regeneration but does not mention the 3-attempt limit. Acceptance criteria must be updated to enforce and surface the limit.

### Coverage Statistics

- **Total PRD FRs:** 35
- **FRs fully covered:** 30
- **FRs missing:** 3 (FR17, FR23, FR24)
- **FRs with model conflict:** 1 (FR16 — entire Epic 5)
- **FRs partially covered:** 1 (FR21)
- **Coverage:** 86% (but Epic 5 model fundamentally misaligned)

---

## UX Alignment Assessment

### UX Document Status

**Not Found** — No UX design document exists in `_bmad-output/planning-artifacts/`.

### Implied UX

This is a user-facing web application (SaaS B2B). UX is heavily implied by PRD and epics:

| UI Component | Source |
|---|---|
| Split-pane inbox shell (email list + reading pane) | PRD user journeys, Epic 4 |
| In-place reply composer (FR17) | PRD FR17 — new requirement |
| AI trigger button ("AI wand button") | PRD scope, user journeys |
| Quote confirmation pop-in (FR24) | PRD FR24 — new requirement |
| Priority inbox with category filters | Epic 4 stories |
| KB file management page | Epic 3 stories |
| Onboarding stepper (3 steps) | Epic 6 — Magic UI onboarding-stepper mentioned |
| Settings page (tone, language, mailbox) | Epic 6 Story 6.2 |
| Draft editor with action buttons | Epic 5 stories |

### Warnings

⚠️ **No formal UX document.** For a V1 product targeting "familiarity without training", the absence of UX specs for the core composer-first layout (split-pane, composer position, AI button placement) creates implementation risk — developers must infer UX from PRD narrative and epic stories.

**Particularly at risk without UX specs:**
- Reply composer layout alongside reading pane (FR17 — new requirement, no visual reference)
- Quote confirmation pop-in interaction flow (FR24 — new requirement)
- AI trigger button placement and feedback states
- On-demand generation loading state within composer

**Recommendation:** No formal UX doc required before implementation, but Story 5.X and any composer-related stories should include explicit acceptance criteria for layout and interaction behavior.

---

## Epic Quality Review

### Epic 1: Foundation & User Authentication ✅ Good

**User Value:** ✅ Clear — users can register, verify, login, delete account
**Independence:** ✅ Standalone
**FR Coverage:** FR1, FR2, FR3, FR4, FR33, FR34, FR35

| Story | User Value | AC Quality | Issues |
|---|---|---|---|
| 1.1 Project Init & CI/CD | ⚠️ Developer story ("As a developer") | ✅ Good BDD | 🟠 Technical milestone, not user story |
| 1.2 Registration & Verification | ✅ | ✅ Good, covers error | None |
| 1.3 Login & Logout | ✅ | ✅ Good, covers invalid creds | None |
| 1.4 Account Deletion GDPR | ✅ | ✅ Good, covers partial failure | None |

🟠 **Story 1.1** — "As a developer" is a technical milestone, not a user story. Acceptable for project setup but should be noted as a technical story, not a user story.
🟠 **Database Schema** — Additional Requirements specify "all tables upfront" in Story 1.1. This violates incremental table creation best practices (each story should create the tables it needs). Pragmatically acceptable for a small project, but it creates a risk of over-engineering upfront.

---

### Epic 2: Email Mailbox Connection & Sync ✅ Good

**User Value:** ✅ Clear — users can connect and sync their mailbox
**Independence:** ✅ Depends only on Epic 1 (correct)
**FR Coverage:** FR5, FR6, FR7, FR8, FR9

| Story | User Value | AC Quality | Issues |
|---|---|---|---|
| 2.1 Gmail OAuth | ✅ | ✅ 3 scenarios | 🟡 AC mentions "minimum required scopes (read, send, label)" — implementation detail |
| 2.2 Outlook OAuth | ✅ | ⚠️ Only 2 scenarios | 🟡 Less detailed than 2.1 — missing scopes and token expiry scenario |
| 2.3 IMAP/SMTP | ✅ | ✅ Good | None |
| 2.4 Disconnection | ✅ | ✅ Good | None |
| 2.5 Auto Sync | ✅ | ✅ Good, covers failure | None |

---

### Epic 3: Knowledge Base Management ✅ Good

**User Value:** ✅ Clear — users manage their business data
**Independence:** ✅ Depends only on Epic 1 (auth)
**FR Coverage:** FR25-FR29

All 4 stories well-structured. No significant quality issues.

---

### Epic 4: Inbox Triage & Navigation ✅ Good (minor issues)

**User Value:** ✅ Clear — users see prioritized, filtered inbox
**Independence:** ✅ Depends on Epic 1 + 2 (correct)
**FR Coverage:** FR10-FR15

| Story | User Value | AC Quality | Issues |
|---|---|---|---|
| 4.1 Auto-categorization | ✅ | ✅ Covers LLM failure | None |
| 4.2 Priority-Sorted Inbox | ✅ | ✅ Good | 🟡 AC mentions "NFR24 WebSocket" — implementation detail in AC |
| 4.3 Inbox Filtering | ✅ | ✅ URL persistence noted | None |
| 4.4 Manual Actions | ✅ | ✅ 3 scenarios covered | 🟠 FR23 (Delete email) not covered — delete is a different action from archive |

---

### Epic 5: AI Draft Generation & Sending ❌ CRITICAL ISSUES

**User Value:** ✅ nominally — but model is fundamentally wrong
**Independence:** Depends on Epics 1, 2, 3 (correct)
**FR Coverage (claimed):** FR16-FR23 (OLD numbering — now misaligned)

| Story | Issue |
|---|---|
| **5.1 Async Draft Generation Pipeline** | 🔴 **CRITICAL** — entire story describes background generation at sync time. "As a user, I want draft replies generated **automatically when my emails sync**" directly contradicts PRD FR16 (on-demand trigger). Must be replaced. |
| **5.2 Draft View with Confidence Score** | 🔴 **CRITICAL** — references confidence score badge (Magic UI confidence-badge). Confidence scoring is explicitly out of V1 scope in updated PRD. |
| 5.3 Validate & Send | ✅ Valid for both models | |
| 5.4 Edit Draft | ✅ Valid | |
| 5.5 Regenerate with Instruction | ⚠️ Missing 3-attempt limit in AC | 🟠 FR21 requires "system limits AI generation to 3 attempts per email" — not enforced in story |
| 5.6 Reject & Compose | ✅ Valid | |

**Missing stories from Epic 5:**
- No story for on-demand AI trigger (replaces Story 5.1)
- No story for quote confirmation pop-in (FR24)
- No story for reply composer UI (FR17) — could belong here or Epic 4

---

### Epic 6: Guided Onboarding Experience ✅ Good

**User Value:** ✅ Clear — users complete setup without friction
**Independence:** Depends on Epics 1, 2, 3 (correct — onboarding guides through them)
**FR Coverage:** FR30, FR31, FR32

All 3 stories well-structured, good AC coverage including error states.

---

### Best Practices Compliance Summary

| Check | Status |
|---|---|
| All epics deliver user value | ⚠️ Story 1.1 is technical, Epic 5 model is wrong |
| Epic independence (no forward deps) | ✅ |
| Story dependencies within epics | ✅ |
| Database creation timing | 🟠 All-upfront in Story 1.1 (pragmatic but violates incremental approach) |
| Clear acceptance criteria (Given/When/Then) | ✅ All stories use BDD format |
| FR traceability maintained | ⚠️ Epic 5 FR map uses old PRD numbering |
| Greenfield project setup story | ✅ Story 1.1 covers this |

### Quality Violations Summary

**🔴 Critical (2):**
1. Story 5.1 — background generation model contradicts updated PRD FR16
2. Story 5.2 — confidence score references out-of-scope feature

**🟠 Major (3):**
3. Story 1.1 — technical/developer story (not user story)
4. Story 5.5 — 3-generation limit not in acceptance criteria
5. Epic 5 FR Coverage Map uses stale FR numbers

**🟡 Minor (3):**
6. Story 2.2 — less detailed ACs than Story 2.1 (missing token expiry scenario)
7. Story 2.1 AC — OAuth scope names are implementation detail
8. Story 4.2 AC — NFR24/WebSocket is implementation detail

---

## Summary and Recommendations

### Overall Readiness Status

**⚠️ NEEDS WORK** — Implementation can begin on Epics 1–4 and 6. Epic 5 must be revised before AI draft work starts.

### Critical Issues Requiring Immediate Action

1. **Epic 5 model mismatch (Story 5.1 + 5.2):** The entire draft generation flow is built around background/async generation. The updated PRD requires on-demand, user-triggered generation from a reply composer. Story 5.1 must be replaced with a new "On-Demand Draft Generation" story. Story 5.2's confidence score display references a feature explicitly excluded from V1 scope.

2. **3 missing FRs with no stories (FR17, FR23, FR24):** Reply composer UI, email delete, and quote confirmation pop-in are new FRs with zero story coverage. These are core to the on-demand experience.

3. **epics.md FR Coverage Map is stale:** The coverage map still lists old FR numbers (old FR16="background generation", old FR17="confidence score"). It must be updated to reflect the new FR1–FR35 numbering and content.

### Recommended Next Steps

1. **Revise Epic 5 before any AI work begins:**
   - Replace Story 5.1 ("Async Draft Generation Pipeline") with: "On-Demand AI Reply Generation" — user clicks trigger button, system generates draft within 10 seconds and displays it in composer
   - Replace Story 5.2 ("Draft View with Confidence Score") with: "Reply Composer with AI Trigger" — covers FR17 (in-place composer) and the AI button
   - Update Story 5.5 AC to include 3-attempt limit enforcement
   - Remove all confidence score references from Epic 5

2. **Add 3 missing stories:**
   - New Story 4.5 (or 5.X): "Delete Email from Inbox" — covers FR23
   - New Story 5.X: "Quote-Oriented Reply Confirmation" — covers FR24 (pop-in when quote request detected)

3. **Update epics.md FR Coverage Map** to reflect new FR1–FR35 numbering and updated Epic 5 scope

4. **Epics 1–4 and 6 are implementation-ready** — proceed with current story queue for auth, mailbox connection, KB, inbox triage, and onboarding.

### Issue Count Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 2 (Story 5.1 model, Story 5.2 out-of-scope feature) |
| 🟠 Major | 5 (3 missing stories + stale FR map + Story 5.5 limit) |
| 🟡 Minor | 3 (AC implementation details, Story 2.2 depth) |
| ⚠️ Warning | 1 (No UX document) |
| **Total** | **11** |

### Final Note

This assessment identified 11 issues across 4 categories. Epics 1–4 and 6 (22 stories) are ready to implement. Epic 5 (6 stories) requires revision before AI draft work begins — the model shift from background to on-demand generation is fundamental and touches every story in that epic.

**Assessment date:** 2026-04-06
**Documents assessed:** PRD (35 FRs), Architecture, Epics (6 epics, 22 stories)
