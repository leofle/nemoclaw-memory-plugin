# NemoClaw Memory Plugin (Open Source)

An open-source long-term memory plugin for **NemoClaw / OpenClaw-style** agent runtimes.

Designed from patterns used by:
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
- **Deduplication** — near-identical memories (cosine similarity ≥ 0.92) are skipped automatically.
- **Tool interface** with input validation:
  - `memory_store` — explicitly store a memory for a user
  - `memory_search` — search memories by query
  - `memory_forget` — delete a memory by ID
- **Persistent storage** in a local JSON file.
- **Heuristic categorization** (`preference`, `profile`, `project`, `general`) with an expanded trigger vocabulary.
- **TypeScript** source with strict types, declaration files, and a `dist/` build.

## Install

```bash
npm install @nemoclaw/memory-plugin
```

## Usage

```ts
import { createNemoClawMemoryPlugin } from '@nemoclaw/memory-plugin';

const plugin = createNemoClawMemoryPlugin({
  storePath: '.nemoclaw/memory.json',
  maxRecall: 10,
  minSimilarity: 0.2,
  dedupThreshold: 0.92, // optional, default 0.92
});

await plugin.setup(hostRuntime);
```

Your runtime should provide compatible hooks:

- `registerTool(name, handler)`
- `onBeforeAssistantTurn(handler)`
- `onAfterAssistantTurn(handler)`

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `storePath` | `string` | `.nemoclaw/memory.json` | Path to the JSON memory file |
| `maxRecall` | `number` | `8` | Max memories returned per recall |
| `minSimilarity` | `number` | `0.2` | Minimum cosine similarity to surface a memory |
| `dedupThreshold` | `number` | `0.92` | Similarity above which a new memory is considered a duplicate |

## Memory categories

Memories are automatically classified into one of four categories based on heuristic keyword matching:

| Category | Triggered by |
|---|---|
| `preference` | *I like / love / prefer / dislike / hate / enjoy / avoid / always / usually…* |
| `profile` | *I am / work / live / my name is / my timezone / my role / I studied…* |
| `project` | *working on / building / project / deadline / milestone / sprint / shipping…* |
| `general` | Explicit memory cues: *remember this / important: / note that / keep in mind / don't forget…* |

## Development

```bash
# Run tests (TypeScript via tsx)
npm test

# Type-check
npm run lint

# Compile to dist/
npm run build
```

## Design notes

### Why local JSON storage first?

To ensure a minimal dependency footprint and high portability. You can replace `JsonMemoryStore` with a DB-backed adapter later.

### Why deterministic embeddings?

This project uses local hash-based embeddings for zero-cost, deterministic tests. In production, swap in OpenAI/NVIDIA embeddings while keeping the same `MemoryEngine` interface.

### Why TypeScript?

Strict types catch integration mistakes at compile time and make the plugin easier to consume in typed codebases. The compiled `dist/` output ships with `.d.ts` declaration files.

## License

MIT
