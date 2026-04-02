---
name: bmad-git-workflow
description: Git branch, commit, and PR operations for story lifecycle. Use when dev-story needs to create a branch, commit work, or open a PR.
---

# bmad-git-workflow

## Overview

This skill handles git operations for story implementation: creating the feature branch at the start, committing completed work, and opening a PR at the end. Act as a senior developer who knows the project's git conventions and executes them precisely without user intervention.

**This project uses a 3-stage promotion model:**
- `dev` = integration branch for all feature work
- `qa` = review and validation branch
- `main` = production branch

All changes must move through this exact path:
```
story/* -> dev -> qa -> main
```

CI enforces this routing — PRs that skip a stage are blocked automatically.

**Convention (from CONTRIBUTING.md):**
- Branch: `story/X-Y-short-description` from **`origin/dev`** (remote source of truth)
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- PR target: **`dev`** (never `qa` or `main` directly — CI will block it)
- Merge strategy: squash merge only
- Squash title format: `feat: story X.Y — <title>`
- CI must pass before merge: `npm run typecheck && npm run lint && npm test && deno lint supabase/functions && deno check supabase/functions/sync-emails/index.ts`

**Args accepted:**
- `--branch <story_key>` — create branch for the given story key
- `--commit <story_key> <story_title>` — stage and commit all story changes
- `--pr <story_key> <story_title>` — push branch and open PR against `dev`
- `--finish <story_key> <story_title>` — commit + push + open PR (shorthand for the end of dev-story)

## On Activation

Load available config from `{project-root}/_bmad/bmm/config.yaml`. Use sensible defaults for anything not configured.

Resolve `story_key` (e.g. `2-1-gmail-mailbox-connection-via-oauth`) and `story_title` (e.g. `Gmail Mailbox Connection via OAuth`) from args or calling context.

## Branch Operation (`--branch`)

Goal: ensure the working branch is `story/{story_key_short}` created from **`origin/dev`** (not local `dev`).

- Derive `story_key_short`: take the first 3–4 meaningful words of the story key slug (e.g. `2-1-gmail-oauth` from `2-1-gmail-mailbox-connection-via-oauth`)
- Check current branch — if already on a `story/` branch matching this story, skip creation
- Otherwise:
  ```bash
  git fetch origin
  git checkout -b story/{story_key_short} origin/dev
  ```
- If there are uncommitted changes on the wrong branch, stash → switch → pop
- Report the active branch name

**HALT if:** branch creation fails and the working branch is not a `story/` branch.

## Commit Operation (`--commit`)

Goal: stage all story-related changes and produce a clean, conventional commit.

- Stage only files relevant to this story (new + modified — not unrelated noise like `.claude/settings.local.json`, `.mcp.json`)
- Run CI locally before committing:
  ```bash
  npm run typecheck
  npm run lint
  npm test
  deno lint supabase/functions
  deno check supabase/functions/sync-emails/index.ts
  ```
- If any check fails: fix the issue before committing — do not commit broken code
- Commit message format:
  ```
  feat: story X.Y — {story_title}

  {bullet summary of what was implemented, 3–5 lines}

  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
- Use `feat:` for story implementation; `fix:` for bug fixes; `chore:` for tooling

## PR Operation (`--pr`)

Goal: push the branch and open a PR against **`dev`** using `gh`.

```bash
git push -u origin story/{story_key_short}
gh pr create --title "feat: story X.Y — {story_title}" --base dev --body "..."
```

- PR title: `feat: story X.Y — {story_title}`
- PR base: **`dev`** (always — never `qa` or `main`)
- PR body: brief description of what the story implements + checklist + "Closes story {story_key}"
- Report the PR URL

## Finish Operation (`--finish`)

Runs `--commit` then `--pr` in sequence. Used by `dev-story` at completion.

## Branch Naming Reference

```
story/X-Y-short-description   # story implementation  → story/2-1-gmail-oauth
feature/short-description      # generic feature       → feature/mailbox-sync-status
fix/short-description          # bug fix               → fix/middleware-proxy-conflict
chore/short-description        # tooling / config      → chore/upgrade-supabase-ssr
docs/short-description         # docs only             → docs/update-readme
refactor/short-description     # refactor only         → refactor/oauth-service-extraction
```

All of the above target `dev` as PR base.

## CI Rules (enforced by `.github/workflows/ci.yml`)

```
Allowed PR targets:
  feature/*, story/*, fix/*, chore/*, docs/*, refactor/* -> dev
  dev -> qa
  qa -> main

Blocked by CI:
  story/* -> qa or main  (skip not allowed)
  dev -> main            (must go through qa)
```

## Error Handling

- If `origin/dev` cannot be fetched or does not exist: HALT and report — do not fallback to local `dev`.
- If CI checks fail locally: fix before committing — do not bypass with `--no-verify`.
- If `gh` is not authenticated: HALT with message "Run `gh auth login` to authenticate GitHub CLI."
- If CI fails after PR creation: report the failure URL but do not close the PR — leave for user review.
