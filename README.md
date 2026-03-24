# NemoClaw Memory Plugin (Open Source)

An open-source long-term memory plugin for **NemoClaw / OpenClaw-style** agent runtimes.

It is designed from patterns used by:
- **Supermemory's OpenClaw plugin** (tooling + auto-recall/auto-capture workflow).
- **Mem0** (importance filtering, categorized memories, memory retrieval over simple chat history replay).

## Goals

- Reliable local operation with no required cloud dependency.
- Deterministic, testable memory behavior.
- Simple plugin hooks that can adapt to OpenClaw wrappers.
- MIT-licensed for open-source distribution.

## Features

- **Auto-capture** after each turn (user + assistant text, if memory-worthy).
- **Auto-recall** before each assistant turn.
- **Tool interface**:
  - `memory_store`
  - `memory_search`
  - `memory_forget`
- **Persistent storage** in JSON file.
- **Heuristic categorization** (`preference`, `profile`, `project`, `general`).

## Install

```bash
npm install @nemoclaw/memory-plugin
```

## Usage

```js
import { createNemoClawMemoryPlugin } from '@nemoclaw/memory-plugin';

const plugin = createNemoClawMemoryPlugin({
  storePath: '.nemoclaw/memory.json',
  maxRecall: 10,
  minSimilarity: 0.2,
});

await plugin.setup(hostRuntime);
```

Your runtime should provide compatible hooks:

- `registerTool(name, handler)`
- `onBeforeAssistantTurn(handler)`
- `onAfterAssistantTurn(handler)`

## Design notes

### Why local JSON storage first?

To ensure a minimal dependency footprint and high portability. You can replace `JsonMemoryStore` with a DB-backed adapter later.

### Why deterministic embeddings?

This project uses local hash-based embeddings for zero-cost and deterministic tests. In production, you can swap embeddings with OpenAI/NVIDIA embeddings while keeping the same `MemoryEngine` workflow.

## Development

```bash
npm test
```

## License

MIT
