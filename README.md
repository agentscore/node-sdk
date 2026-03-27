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

// On-the-fly assessment with policy (paid)
const result = await client.assess("0x1234...", {
  policy: { min_grade: "B", min_score: 35 },
});
console.log(result.decision, result.decision_reasons);

// Browse agents
const agents = await client.getAgents({ chain: "base", limit: 10 });
console.log(agents.items.length, agents.count);

// Ecosystem stats
const stats = await client.getStats();
console.log(stats.erc8004?.known_agents);
```

## Configuration

| Option    | Type     | Default                     | Description              |
| --------- | -------- | --------------------------- | ------------------------ |
| `apiKey`  | `string` | ---                         | API key from [agentscore.sh](https://agentscore.sh) |
| `baseUrl` | `string` | `https://api.agentscore.sh` | API base URL             |
| `timeout` | `number` | `10000`                     | Request timeout in ms    |

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
