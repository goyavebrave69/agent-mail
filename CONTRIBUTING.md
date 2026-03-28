# Contributing to mail-agent

## Git Workflow — GitHub Flow

`main` is always deployable. Every change goes through a branch + PR.

### Branch Naming

```
story/X-Y-short-description     # story implementation  → story/2-1-gmail-oauth
fix/short-description            # bug fix               → fix/middleware-proxy-conflict
chore/short-description          # tooling / config      → chore/upgrade-supabase-ssr
docs/short-description           # docs only             → docs/update-readme
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
1. git checkout -b story/X-Y-description
2. implement + commit
3. git push -u origin story/X-Y-description
4. open PR → CI runs automatically
5. CI passes → squash merge → branch deleted automatically
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
