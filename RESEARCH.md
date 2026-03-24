# Research Notes: NemoClaw Memory Plugin

## Sources reviewed

1. Supermemory OpenClaw plugin repository and README.
2. Mem0 repository/README and architecture descriptions.
3. OpenClaw plugin package patterns (`@opencode-ai/plugin` ecosystem structure).

## Key takeaways

### From Supermemory

- Effective UX comes from **automatic recall before model turn** and **automatic capture after turn**.
- Memory tools should remain available for explicit operations (`store/search/forget`).
- Namespacing by user/session and configurable limits improve safety and relevance.

### From Mem0

- Long-term memory should not equal full transcript replay.
- High-quality memory requires:
  - relevance filtering,
  - categorization,
  - retrieval ranking.
- A composable architecture (engine + pluggable stores/embeddings) is crucial.

## Design decisions for this project

- Start with a deterministic local-first implementation for reliability and testability.
- Implement a clean `MemoryEngine` with adapters for store and embeddings.
- Use runtime hooks aligned with OpenClaw-style plugin lifecycle.
- Keep project MIT licensed and dependency-light for open-source adoption.

## Next upgrades (recommended)

- Add pluggable embedding provider (OpenAI/NVIDIA NIM).
- Add SQLite/Postgres store adapters.
- Add memory TTL and confidence scores.
- Add PII redaction controls and audit log events.
