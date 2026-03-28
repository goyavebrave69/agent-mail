# Story 1.5: Git Workflow & Branch Protection

Status: ready-for-dev

## Story

As a developer,
I want a structured git workflow with branch protection and PR conventions,
so that `main` is always stable, code is reviewed before merging, and the project history is clean and traceable.

## Acceptance Criteria

1. **Given** a developer starts work on a new story
   **When** they begin implementation
   **Then** they create a branch named `story/X-Y-short-description` from `main`
   **And** all commits follow the Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)

2. **Given** a story implementation is complete
   **When** the developer opens a pull request
   **Then** the CI pipeline runs automatically (type-check, lint, tests)
   **And** the PR cannot be merged unless CI passes
   **And** `main` is protected: direct pushes are blocked

3. **Given** a PR is approved and CI passes
   **When** it is merged
   **Then** a squash merge is used to keep `main` history linear
   **And** the feature branch is deleted after merge

## Tasks / Subtasks

- [ ] Task 1 — Configure `main` branch protection on GitHub (AC: #2)
  - [ ] Go to GitHub → Repository → Settings → Branches → Add branch ruleset
  - [ ] Rule name: `main-protection`
  - [ ] Target: `main`
  - [ ] Enable: **Require a pull request before merging**
    - Require approvals: 0 (solo project — CI is the gatekeeper, not human review)
    - Dismiss stale PR approvals: off (not needed solo)
  - [ ] Enable: **Require status checks to pass before merging**
    - Add status check: `quality` (matches the job name in `ci.yml`)
    - Require branches to be up to date: on
  - [ ] Enable: **Block force pushes**
  - [ ] Enable: **Delete head branch after merge** (auto-cleanup)
  - [ ] Save ruleset

- [ ] Task 2 — Configure default merge strategy to Squash on GitHub (AC: #3)
  - [ ] Go to GitHub → Repository → Settings → General → Pull Requests
  - [ ] Uncheck **Allow merge commits**
  - [ ] Uncheck **Allow rebase merging**
  - [ ] Keep only **Allow squash merging** checked
  - [ ] Set squash commit message to: **Pull request title and description**

- [ ] Task 3 — Add `CONTRIBUTING.md` documenting the workflow (AC: #1, #2, #3)
  - [ ] Create `CONTRIBUTING.md` at project root with:
    - Branch naming: `story/X-Y-short-description` (e.g. `story/2-1-gmail-oauth`)
    - Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
    - PR workflow: branch → PR → CI passes → squash merge → delete branch
    - How to run CI locally: `npm run typecheck && npm run lint && npm test`

- [ ] Task 4 — Retroactively clean up existing commits on `main` (AC: #1)
  - [ ] This is **documentation only** — no rewriting of history on `main`
  - [ ] All future commits must follow Conventional Commits from this point forward
  - [ ] Existing commits (`feat: story 1.2`, `chore: remove deprecated middleware.ts`) are already conventional ✅

- [ ] Task 5 — Create and push first compliant feature branch for validation (AC: #1, #2, #3)
  - [ ] Create branch `story/1-5-git-workflow` from `main`
  - [ ] Add `CONTRIBUTING.md` on this branch
  - [ ] Open PR → verify CI runs → verify merge is blocked until CI passes
  - [ ] Squash merge → verify branch is deleted automatically

## Dev Notes

### Workflow Choice: GitHub Flow

**GitHub Flow** — not Git Flow — is the right choice here:
- `main` = always deployable (Vercel deploys from `main`)
- One branch per story, short-lived (days, not weeks)
- No `develop`, `release`, or `hotfix` branches — unnecessary overhead for a solo/small team
- Simple mental model: branch → PR → merge → done

**Why not Git Flow?** Git Flow adds `develop`, `release`, and `hotfix` branches. Valuable for teams with scheduled releases. Overkill here — Vercel gives continuous deployment, so every merge to `main` is a release.

### Branch Naming Convention

```
story/X-Y-short-description     → story implementation
fix/short-description           → hotfix or bug outside a story
chore/short-description         → tooling, config, infra
docs/short-description          → documentation only
```

Examples:
- `story/2-1-gmail-oauth`
- `fix/middleware-proxy-conflict`
- `chore/upgrade-supabase-ssr`

### Conventional Commits Reference

```
feat:      new feature (maps to story implementation)
fix:       bug fix
chore:     tooling, config, deps, refactoring without behavior change
docs:      documentation only
test:      test-only changes
refactor:  code restructure without feature/fix
```

Squash merge title format: `feat: story X.Y — <title>` (matches existing history pattern)

### CI Already Configured Correctly

`ci.yml` already runs on `pull_request` to `main` with job name `quality`. The branch protection status check name must match exactly: **`quality`**.

### Task 1 is Manual (GitHub UI)

Branch protection rules require GitHub repository admin access — cannot be automated via CLI without a GitHub token. Tasks 1 and 2 are performed manually in the GitHub UI. Task 5 validates that everything works end-to-end.

### What This Story Does NOT Do

- Does NOT add commit-msg hooks (commitlint) — adds friction for solo dev, CI is sufficient
- Does NOT add Husky pre-commit hooks — `npm run typecheck && npm test` covers this in CI
- Does NOT set up CODEOWNERS — solo project
- Does NOT add PR templates — kept lean; `CONTRIBUTING.md` is the reference

### References

- Existing CI: [.github/workflows/ci.yml]
- GitHub Branch Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets
- Conventional Commits: https://www.conventionalcommits.org

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
