---
name: bmad-git-workflow
description: Git branch, commit, and PR operations for story lifecycle. Use when dev-story needs to create a branch, commit work, or open a PR.
---

# bmad-git-workflow

## Overview

This skill handles git operations for story implementation: creating the feature branch at the start, committing completed work, and opening a PR at the end. Act as a senior developer who knows the project's git conventions and executes them precisely without user intervention.

**Convention (from CONTRIBUTING.md and Story 1.5):**
- Branch: `story/X-Y-short-description` from `main`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- PR: squash merge, CI must pass, branch deleted after merge
- Squash title format: `feat: story X.Y — <title>`

**Args accepted:**
- `--branch <story_key>` — create branch for the given story key
- `--commit <story_key> <story_title>` — stage and commit all story changes
- `--pr <story_key> <story_title>` — push branch and open PR against `main`
- `--finish <story_key> <story_title>` — commit + push + open PR (shorthand for the end of dev-story)

## On Activation

Load available config from `{project-root}/_bmad/bmm/config.yaml`. Use sensible defaults for anything not configured.

Resolve `story_key` (e.g. `2-1-gmail-mailbox-connection-via-oauth`) and `story_title` (e.g. `Gmail Mailbox Connection via OAuth`) from args or calling context.

## Branch Operation (`--branch`)

Goal: ensure the working branch is `story/{story_key_short}` created from an up-to-date `main`.

- Derive `story_key_short`: take the first 3–4 meaningful words of the story key slug (e.g. `2-1-gmail-oauth` from `2-1-gmail-mailbox-connection-via-oauth`)
- Check current branch — if already on a `story/` branch matching this story, skip creation
- Otherwise: `git fetch origin`, `git checkout main`, `git pull origin main`, `git checkout -b story/{story_key_short}`
- If there are uncommitted changes on the wrong branch, stash → switch → pop
- Report the active branch name

**HALT if:** branch creation fails and the working branch is not a `story/` branch.

## Commit Operation (`--commit`)

Goal: stage all story-related changes and produce a clean, conventional commit.

- Stage only files relevant to this story (new + modified — not unrelated noise like `.claude/settings.local.json`)
- Commit message format:
  ```
  feat: story X.Y — {story_title}

  {bullet summary of what was implemented, 3–5 lines}

  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
- Use `feat:` for story implementation; use `fix:` if the commit is purely a bug fix

## PR Operation (`--pr`)

Goal: push the branch and open a PR against `main` using `gh`.

- `git push -u origin story/{story_key_short}`
- PR title: `feat: story X.Y — {story_title}`
- PR body: brief description of what the story implements + "Closes story {story_key}"
- Label: none required
- Report the PR URL

## Finish Operation (`--finish`)

Runs `--commit` then `--pr` in sequence. Used by `dev-story` at completion.

## Error Handling

- If `main` is not up to date with `origin/main` and pull fails (e.g. conflicts): HALT and report — do not force.
- If `gh` is not authenticated: HALT with message "Run `gh auth login` to authenticate GitHub CLI."
- If CI fails after PR creation: report the failure URL but do not close the PR — leave for user review.
