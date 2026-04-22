# @agent-score/sdk

[![npm version](https://img.shields.io/npm/v/@agent-score/sdk.svg)](https://www.npmjs.com/package/@agent-score/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript/Node.js client for the [AgentScore](https://agentscore.sh) trust and reputation API.

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

Bootstrap identity for first-time agents:

```typescript
// Create a session — returns a URL for the user to verify
const session = await client.createSession();
console.log(session.verify_url, session.poll_secret);

// Poll until the user completes verification
const status = await client.pollSession(session.session_id, session.poll_secret);
if (status.status === "verified") {
  console.log(status.operator_token); // "opc_..." — use for future requests
}
```

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

## Documentation

- [API Reference](https://docs.agentscore.sh)

## License

[MIT](LICENSE)
