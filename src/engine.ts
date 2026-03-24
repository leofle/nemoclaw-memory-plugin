import { cosineSimilarity, embedText } from './embedding.js';
import { detectCategory, isMemoryWorthy } from './extractor.js';
import type { JsonMemoryStore } from './store.js';
import type { EngineOptions, Memory } from './types.js';

const DEDUP_THRESHOLD = 0.92;

interface RecallOptions {
  userId: string;
  query: string;
  limit?: number;
}

interface ForgetOptions {
  memoryId: string;
}

interface ScoredMemory extends Memory {
  score: number;
}

export class MemoryEngine {
  readonly store: JsonMemoryStore;
  readonly options: Required<EngineOptions>;

  constructor(store: JsonMemoryStore, options: EngineOptions = {}) {
    this.store = store;
    this.options = {
      maxRecall: options.maxRecall ?? 8,
      minSimilarity: options.minSimilarity ?? 0.2,
      dedupThreshold: options.dedupThreshold ?? DEDUP_THRESHOLD,
    };
  }

  async #isDuplicate(userId: string, embedding: number[]): Promise<boolean> {
    const existing = await this.store.listByUser(userId);
    return existing.some(
      (m) => cosineSimilarity(embedding, m.embedding) >= this.options.dedupThreshold
    );
  }

  async captureTurn({
    userId,
    sessionId,
    userMessage,
    assistantMessage,
  }: {
    userId: string;
    sessionId: string;
    userMessage: string;
    assistantMessage: string;
  }): Promise<Memory[]> {
    const captured: Memory[] = [];
    const candidates = [userMessage, assistantMessage].filter(Boolean);
    for (const text of candidates) {
      if (!isMemoryWorthy(text)) continue;
      const embedding = embedText(text);
      if (await this.#isDuplicate(userId, embedding)) continue;
      const memory = await this.store.insert({
        userId,
        sessionId,
        text,
        category: detectCategory(text),
      });
      captured.push(memory);
    }
    return captured;
  }

  async recall({ userId, query, limit = this.options.maxRecall }: RecallOptions): Promise<ScoredMemory[]> {
    const memories = await this.store.listByUser(userId);
    const queryEmbedding = embedText(query);
    return memories
      .map((m): ScoredMemory => ({
        ...m,
        score: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .filter((m) => m.score >= this.options.minSimilarity)
      .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async forget({ memoryId }: ForgetOptions): Promise<number> {
    return this.store.removeById(memoryId);
  }
}
