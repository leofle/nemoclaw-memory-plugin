import { JsonMemoryStore } from './store.js';
import { MemoryEngine } from './engine.js';

/**
 * NemoClaw/OpenClaw-style plugin factory.
 *
 * Expected host hooks (best-effort compatibility):
 * - onBeforeAssistantTurn(ctx): inject recall context
 * - onAfterAssistantTurn(ctx): capture new memories
 * - registerTool(name, handler): expose memory tools
 */
export function createNemoClawMemoryPlugin(config = {}) {
  const store = new JsonMemoryStore(config.storePath ?? '.nemoclaw/memory.json');
  const engine = new MemoryEngine(store, {
    maxRecall: config.maxRecall,
    minSimilarity: config.minSimilarity,
  });

  return {
    name: 'nemoclaw-memory',
    version: '0.1.0',

    async setup(host) {
      host?.registerTool?.('memory_store', async ({ userId, sessionId, text }) => {
        if (!userId) throw new Error('memory_store requires userId');
        if (!text || !text.trim()) throw new Error('memory_store requires non-empty text');
        const [memory] = await engine.captureTurn({
          userId,
          sessionId,
          userMessage: text,
          assistantMessage: '',
        });
        return memory ?? null;
      });

      host?.registerTool?.('memory_search', async ({ userId, query, limit }) => {
        if (!userId) throw new Error('memory_search requires userId');
        if (!query || !query.trim()) throw new Error('memory_search requires non-empty query');
        return engine.recall({ userId, query, limit });
      });

      host?.registerTool?.('memory_forget', async ({ memoryId }) => {
        if (!memoryId) throw new Error('memory_forget requires memoryId');
        const removed = await engine.forget({ memoryId });
        return { removed };
      });

      host?.onBeforeAssistantTurn?.(async (ctx) => {
        if (!ctx?.userId || !ctx?.userMessage) return;
        const recalled = await engine.recall({
          userId: ctx.userId,
          query: ctx.userMessage,
        });
        if (recalled.length) {
          const memoryPrompt = recalled
            .map((m) => `- (${m.category}) ${m.text}`)
            .join('\n');
          ctx.injectSystem?.(`Relevant long-term memory:\n${memoryPrompt}`);
        }
      });

      host?.onAfterAssistantTurn?.(async (ctx) => {
        if (!ctx?.userId || !ctx?.sessionId) return;
        await engine.captureTurn({
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          userMessage: ctx.userMessage ?? '',
          assistantMessage: ctx.assistantMessage ?? '',
        });
      });
    },
  };
}
