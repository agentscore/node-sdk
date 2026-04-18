# @agent-score/sdk

TypeScript client for the AgentScore trust and reputation API.

## Identity Model

## Methods

- `getReputation(address, options?)` — cached reputation lookup (free)
- `assess(address, options?)` — identity gate with policy (paid). Accepts `operatorToken` for non-wallet agents.
- `createSession(options?)` — create verification session for identity bootstrapping
- `pollSession(sessionId, pollSecret)` — poll session status, returns credential when verified
- `createCredential(options?)` — create operator credential (24h TTL default)
- `listCredentials()` — list active credentials
- `revokeCredential(id)` — revoke a credential

## Architecture

Single-package TypeScript library published to npm.

| File | Purpose |
|------|---------|
| `src/` | Source code |
| `tests/` | Vitest tests |
| `dist/` | Build output (tsup) |

## Tooling

- **Bun** — package manager. Use `bun install`, `bun run <script>`.
- **ESLint 9** — linting. `bun run lint`.
- **tsup** — builds CJS + ESM. `bun run build`.
- **Vitest** — tests. `bun run test`.
- **Lefthook** — git hooks. Pre-commit: lint. Pre-push: typecheck.

## Key Commands

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

## Workflow

1. Create a branch
2. Make changes
3. Lefthook runs lint on commit, typecheck on push
4. Open a PR — CI runs automatically
5. Merge (squash)

## Rules

- **No silent refactors**
- **Never commit .env files or secrets**
- **Use PRs** — never push directly to main

## Releasing

1. Update `version` in `package.json`
2. Commit: `git commit -am "chore: bump to vX.Y.Z"`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push && git push origin vX.Y.Z`

The publish workflow runs on `ubuntu-latest` (required for npm trusted publishing), builds, publishes to npm with provenance, and creates a GitHub Release.

npm scope is `@agent-score`. User-Agent header uses `@agentscore` (brand name).
