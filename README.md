# @agent-score/sdk

[![npm version](https://img.shields.io/npm/v/@agent-score/sdk.svg)](https://www.npmjs.com/package/@agent-score/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript/Node.js client for the [AgentScore](https://agentscore.sh) APIs.

## Install

```bash
npm install @agent-score/sdk
# or
bun add @agent-score/sdk
```

## Quick Start

```typescript
import { AgentScore } from "@agent-score/sdk";

const client = new AgentScore({ apiKey: "as_live_..." });

// Look up cached reputation (free)
const rep = await client.getReputation("0x1234...");
console.log(rep.score.value, rep.score.grade);

// Filter to a specific chain
const baseRep = await client.getReputation("0x1234...", { chain: "base" });
console.log(baseRep.agents); // only Base agents

// Identity gate with policy (paid)
const gated = await client.assess("0x1234...", {
  policy: {
    require_kyc: true,
    require_sanctions_clear: true,
    min_age: 21,
  },
});

if (gated.decision === "deny") {
  console.log(gated.decision_reasons); // ["kyc_required"]
  console.log(gated.verify_url);       // URL for operator verification
}

// Check verification level on reputation
const verified = await client.getReputation("0x1234...");
console.log(verified.verification_level); // "none" | "wallet_claimed" | "kyc_verified"
```

### Credential-Based Identity

Agents without wallets can use operator credentials for identity:

```typescript
// Assess with an operator credential instead of a wallet address
const result = await client.assess(null, { operatorToken: "opc_..." });
console.log(result.decision); // "allow" | "deny"
```

### Verification Sessions

Bootstrap identity for first-time agents. The success body carries structured `next_steps` (with `action: "deliver_verify_url_and_poll"`) and a cross-merchant `agent_memory` hint. Poll responses carry `next_steps.action` from the typed `NextStepsAction` union (`continue_polling`, `retry_merchant_request_with_operator_token`, `use_stored_operator_token`, `create_new_session`, `verification_failed`, `contact_support`).

```typescript
// Create a session — returns a verify_url for the user and a poll_url for the agent
const session = await client.createSession();
console.log(session.verify_url, session.poll_url, session.poll_secret);
console.log(session.next_steps.action); // "deliver_verify_url_and_poll"

// Poll until the user completes verification
const status = await client.pollSession(session.session_id, session.poll_secret);
if (status.status === "verified") {
  console.log(status.operator_token); // "opc_..." — use for future requests
}

// Optional pre-association: attach the session to a known wallet or refresh KYC
// for an existing operator credential.
await client.createSession({ address: "0x..." });
await client.createSession({ operator_token: "opc_..." }); // KYC refresh
```

### Wallet resolution

`assess()` responses include `resolved_operator` and `linked_wallets[]` — all same-operator sibling wallets (claimed via SIWE or captured via prior `associateWallet`). The list may mix EVM addresses (`0x...` lowercased) and Solana addresses (base58, case-preserved) for cross-chain operators; merchants doing wallet-signer-match checks should accept a payment signed by any address in the list, regardless of chain. The `address` parameter on `assess()` and `getReputation()` accepts either format — network is auto-detected from the address shape.

### Credential Management

```typescript
const cred = await client.createCredential({ label: "my-agent", ttl_days: 7 });
console.log(cred.credential); // shown once

const list = await client.listCredentials();
console.log(list); // active, non-expired credentials

await client.revokeCredential(cred.id);
```

### Report an Agent's Wallet (Cross-Merchant Attribution)

After an agent authenticated via `operator_token` completes a payment, report the signer wallet so AgentScore can build a cross-merchant credential↔wallet profile. Fire-and-forget — `first_seen` is informational only. `network` is the key-derivation family: `"evm"` for any EVM chain (Base, Tempo, Ethereum, …) or `"solana"` for Solana.

```typescript
await client.associateWallet({
  operatorToken: "opc_...",
  walletAddress: signerFromPayment, // e.g. EIP-3009 `from` or Tempo MPP DID address
  network: "evm",
  idempotencyKey: paymentIntentId, // optional — agent retries of the same payment no-op
});
```

## Configuration

| Option      | Type     | Default                     | Description              |
| ----------- | -------- | --------------------------- | ------------------------ |
| `apiKey`    | `string` | ---                         | API key from [agentscore.sh](https://agentscore.sh) |
| `baseUrl`   | `string` | `https://api.agentscore.sh` | API base URL             |
| `timeout`   | `number` | `10000`                     | Request timeout in ms    |
| `userAgent` | `string` | ---                         | Prepended to the default `User-Agent` as `"{userAgent} (@agent-score/sdk@{version})"`. Use to attribute API calls to your app. |

## Error Handling

```typescript
import { AgentScore, AgentScoreError } from "@agent-score/sdk";

try {
  await client.getReputation("0xinvalid");
} catch (err) {
  if (err instanceof AgentScoreError) {
    console.error(err.code, err.message, err.status);
  }
}
```

`AgentScoreError.details` carries the rest of the response body — `verify_url`, `linked_wallets`, `claimed_operator`, `actual_signer`, `expected_signer`, `reasons`, `agent_memory` — so callers can branch on granular denial codes without re-parsing.

### Typed error classes

For status-code-specific recovery, the SDK throws typed subclasses of `AgentScoreError`. All inherit from `AgentScoreError` so existing `catch (err) { if (err instanceof AgentScoreError) ... }` still works.

| Class | Triggered by | What it adds |
|---|---|---|
| `PaymentRequiredError` | HTTP 402 | The endpoint is not enabled for this account |
| `TokenExpiredError` | HTTP 401 with `error.code = "token_expired"` | Parsed body fields exposed on the instance: `verifyUrl`, `sessionId`, `pollSecret`, `pollUrl`, `nextSteps`, `agentMemory` — recover without re-parsing `details` |
| `InvalidCredentialError` | HTTP 401 with `error.code = "invalid_credential"` | Permanent — switch tokens or restart |
| `QuotaExceededError` | HTTP 429 with `error.code = "quota_exceeded"` | Account-level cap reached; don't retry |
| `RateLimitedError` | HTTP 429 with `error.code = "rate_limited"` | Per-second sliding-window cap; retry after `Retry-After` |
| `TimeoutError` | Request aborted before a response arrived | Distinct from generic network errors |

```typescript
import {
  AgentScore, AgentScoreError, TokenExpiredError, QuotaExceededError, TimeoutError,
} from "@agent-score/sdk";

try {
  await client.assess("0xabc...", { policy: { require_kyc: true } });
} catch (err) {
  if (err instanceof TokenExpiredError) {
    console.log("Verify at:", err.verifyUrl, "poll with:", err.pollSecret);
  } else if (err instanceof QuotaExceededError) {
    console.log("Account quota reached — surface to user; don't retry.");
  } else if (err instanceof TimeoutError) {
    console.log("Network timeout — retry with backoff.");
  } else if (err instanceof AgentScoreError) {
    console.error(err.code, err.message);
  }
}
```

## Quota observability

`assess()` responses include an optional `quota` field captured from `X-Quota-Limit` / `X-Quota-Used` / `X-Quota-Reset` response headers. Use it to monitor approach-to-cap proactively (warn at 80%, alert at 95%) before a 429:

```typescript
const result = await client.assess("0xabc...", { policy: { require_kyc: true } });
if (result.quota && result.quota.limit && result.quota.used) {
  const pct = (result.quota.used / result.quota.limit) * 100;
  if (pct > 80) console.warn(`AgentScore quota at ${pct.toFixed(1)}% — resets ${result.quota.reset}`);
}
```

`quota` is `undefined` when the API doesn't emit the headers (Enterprise / unlimited tiers).

## Telemetry

`telemetrySignerMatch(payload)` is a fire-and-forget POST to `/v1/telemetry/signer-match` so AgentScore can track aggregate signer-binding behavior across merchants. Used internally by `@agent-score/commerce`'s gate; available directly for custom integrations that perform their own wallet-signer-match checks.

## Documentation

- [API Reference](https://docs.agentscore.sh)

## License

[MIT](LICENSE)
