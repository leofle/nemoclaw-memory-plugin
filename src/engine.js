import { cosineSimilarity, embedText } from './embedding.js';
import { detectCategory, isMemoryWorthy } from './extractor.js';

export class MemoryEngine {
  constructor(store, options = {}) {
    this.store = store;
    this.options = {
      maxRecall: options.maxRecall ?? 8,
      minSimilarity: options.minSimilarity ?? 0.2,
    };
  }

  async captureTurn({ userId, sessionId, userMessage, assistantMessage }) {
    const captured = [];
    const candidates = [userMessage, assistantMessage].filter(Boolean);
    for (const text of candidates) {
      if (!isMemoryWorthy(text)) continue;
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

  async recall({ userId, query, limit = this.options.maxRecall }) {
    const memories = await this.store.listByUser(userId);
    const queryEmbedding = embedText(query);
    return memories
      .map((m) => ({
        ...m,
        score: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .filter((m) => m.score >= this.options.minSimilarity)
      .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async forget({ memoryId }) {
    return this.store.removeById(memoryId);
  }
}
