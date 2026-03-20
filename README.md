# @agentscore/sdk

[![npm version](https://img.shields.io/npm/v/@agentscore/sdk.svg)](https://www.npmjs.com/package/@agentscore/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript/Node.js client for the [AgentScore](https://agentscore.sh) trust and reputation API. Score, verify, and assess AI agent wallets in the [x402](https://github.com/coinbase/x402) payment ecosystem and [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent registry.

## Install

```bash
npm install @agentscore/sdk
# or
bun add @agentscore/sdk
```

## Quick Start

```typescript
import { AgentScore } from "@agentscore/sdk";

const client = new AgentScore({ apiKey: "ask_..." });

// Free reputation summary
const summary = await client.getReputation("0x1234...");
console.log(summary.score, summary.grade);

// Trust decision with policy
const result = await client.getDecision("0x1234...", {
  min_grade: "C",
  min_transactions: 5,
});
console.log(result.decision.allow, result.decision.reasons);

// Batch lookup
const batch = await client.batchReputation(
  ["0x1234...", "0x5678..."],
  { view: "full", policy: { min_grade: "B" } }
);
```

## Configuration

| Option    | Type     | Default                     | Description              |
| --------- | -------- | --------------------------- | ------------------------ |
| `apiKey`  | `string` | —                           | API key from [agentscore.sh](https://agentscore.sh) |
| `baseUrl` | `string` | `https://api.agentscore.sh` | API base URL             |
| `timeout` | `number` | `10000`                     | Request timeout in ms    |

## Error Handling

```typescript
import { AgentScore, AgentScoreError } from "@agentscore/sdk";

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
- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Protocol](https://github.com/coinbase/x402)

## License

[MIT](LICENSE)
