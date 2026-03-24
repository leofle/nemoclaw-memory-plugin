export interface Memory {
  id: string;
  userId: string;
  sessionId: string;
  text: string;
  category: string;
  createdAt: string;
  embedding: number[];
}

export interface MemoryInput {
  id?: string;
  userId: string;
  sessionId: string;
  text: string;
  category?: string;
  createdAt?: string;
}

export interface EngineOptions {
  maxRecall?: number;
  minSimilarity?: number;
  dedupThreshold?: number;
}

export interface PluginConfig {
  storePath?: string;
  maxRecall?: number;
  minSimilarity?: number;
  dedupThreshold?: number;
}

export interface TurnContext {
  userId?: string;
  sessionId?: string;
  userMessage?: string;
  assistantMessage?: string;
  injectSystem?: (text: string) => void;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface Host {
  registerTool?: (name: string, handler: ToolHandler) => void;
  onBeforeAssistantTurn?: (handler: (ctx: TurnContext) => Promise<void>) => void;
  onAfterAssistantTurn?: (handler: (ctx: TurnContext) => Promise<void>) => void;
}
