# Contributing to mail-agent

## Git Workflow — Enforced Promotion Flow

This repository uses a 3-stage promotion model:

- `dev` = integration branch for feature work
- `qa` = review and validation branch
- `main` = production branch

All changes must move through this exact path:

```
feature/story/fix/... -> dev -> qa -> main
```

### Branch Naming

```
feature/short-description        # generic feature       → feature/mailbox-sync-status
story/X-Y-short-description      # story implementation  → story/2-1-gmail-oauth
fix/short-description            # bug fix               → fix/middleware-proxy-conflict
chore/short-description          # tooling / config      → chore/upgrade-supabase-ssr
docs/short-description           # docs only             → docs/update-readme
refactor/short-description       # refactor only         → refactor/oauth-service-extraction
```

### Commit Convention — Conventional Commits

```
feat:      new feature
fix:       bug fix
chore:     tooling, config, deps (no behavior change)
docs:      documentation only
test:      test-only changes
refactor:  restructure without feature/fix
```

Examples:
```
feat: story 2.1 — Gmail mailbox connection via OAuth
fix: middleware proxy conflict on Next.js startup
chore: upgrade @supabase/ssr to 0.6
```

### PR Workflow

```
1. git checkout dev && git pull
2. git checkout -b feature-or-story-branch
3. implement + commit
4. git push -u origin feature-or-story-branch
5. open PR: feature-or-story-branch -> dev
6. CI passes -> merge into dev
7. open PR: dev -> qa
8. CI passes + QA review -> merge into qa
9. open PR: qa -> main
10. CI passes -> merge into main
```

### Automated Branch Policy (CI)

`.github/workflows/ci.yml` enforces branch routing automatically:

```
Allowed PR targets:
- feature/*, story/*, fix/*, chore/*, docs/*, refactor/* -> dev
- dev -> qa
- qa -> main

Blocked by CI:
- direct feature/fix/story -> qa or main
- dev -> main
- any unsupported source/target combination
```

### Automatic Epic-End Promotion (dev -> qa)

When an epic is completed on `dev` (status changes to `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml`), GitHub Actions automatically opens a promotion PR from `dev` to `qa`.

- Workflow file: `.github/workflows/epic-promotion.yml`
- Trigger: push on `dev` where `sprint-status.yaml` changed
- Condition: at least one `epic-*` status newly changed to `done`
- Behavior:
  - if no open `dev -> qa` PR exists: create one automatically
  - if one already exists: add a comment with newly completed epic(s)

### Branch Protection (GitHub Settings)

Configure branch rules in GitHub so CI is mandatory before merge:

- `dev`: require PR + required status check `Type-check, Lint & Test`
- `qa`: require PR + required status check `Type-check, Lint & Test`
- `main`: require PR + required status check `Type-check, Lint & Test`

Optional but recommended:

- block force push on `dev`, `qa`, `main`
- auto-delete source branch after merge
- squash merge only

### Local Branch Setup (one-time)

```bash
git branch dev origin/dev
git branch qa origin/qa
git branch main origin/main
```

If `dev` and `qa` do not exist remotely yet:

```bash
git checkout -b dev main
git push -u origin dev
git checkout -b qa dev
git push -u origin qa
git checkout main
```

### Typical Daily Flow

```bash
1) Start from dev
   git checkout dev && git pull

2) Create work branch
   git checkout -b story/X-Y-description

3) Work + commit + push
   git push -u origin story/X-Y-description

4) Promote with 3 PRs
   story/... -> dev
   dev -> qa
   qa -> main
```

### Merge Strategy

**Squash merge only.** Squash commit title format:
```
feat: story X.Y — <title>
```

### Run CI Locally

```bash
npm run typecheck   # TypeScript strict check
npm run lint        # ESLint
npm test            # Vitest unit tests
```

All three must pass before opening a PR.
