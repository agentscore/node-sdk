# @agent-score/sdk

TypeScript client for the AgentScore trust and reputation API.

## Identity Model

Two identity paths: `X-Wallet-Address` (wallet-based) and `X-Operator-Token` (credential-based). Wallet addresses accept both EVM (`0x...` 40-hex) and Solana (base58, 32–44 chars) formats — network is auto-detected from the address shape. `assess()` responses include `resolved_operator` and `linked_wallets[]` (same-operator sibling wallets, normalized per network — EVM lowercased, Solana base58 verbatim; may mix chains for cross-chain operators). `createSession()` and `createCredential()` responses include an `agent_memory` cross-merchant pattern hint. `createSession()` also returns `next_steps.action: "deliver_verify_url_and_poll"` + polling instructions. `pollSession()` returns `next_steps.action` of `continue_polling`, `retry_merchant_request_with_operator_token`, `use_stored_operator_token`, `create_new_session`, `verification_failed`, or `contact_support` depending on state.

## Methods

- `getReputation(address, options?)` — cached reputation lookup (free)
- `assess(address, options?)` — identity gate with policy (paid). Accepts `operatorToken` for non-wallet agents. Response includes `linked_wallets[]` and `resolved_operator`.
- `createSession(options?)` — create verification session for identity bootstrapping. Returns `agent_memory` + `next_steps`.
- `pollSession(sessionId, pollSecret)` — poll session status, returns credential when verified, plus `next_steps.action`.
- `createCredential(options?)` — create operator credential (24h TTL default). Response includes `agent_memory`.
- `listCredentials()` — list active credentials
- `revokeCredential(id)` — revoke a credential
- `associateWallet({ operatorToken, walletAddress, network, idempotencyKey? })` — report a signer wallet seen paying under a credential. Fire-and-forget; use the payment intent id / tx hash as `idempotencyKey` so retries don't inflate transaction_count.

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
