import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { embedText } from './embedding.js';
import type { Memory, MemoryInput } from './types.js';

interface Db {
  memories: Memory[];
}

export class JsonMemoryStore {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  async insert(input: MemoryInput): Promise<Memory> {
    const db = await this.#load();
    const memory: Memory = {
      id: input.id ?? randomUUID(),
      userId: input.userId,
      sessionId: input.sessionId,
      text: input.text,
      category: input.category ?? 'general',
      createdAt: input.createdAt ?? new Date().toISOString(),
      embedding: embedText(input.text),
    };
    db.memories.push(memory);
    await this.#save(db);
    return memory;
  }

  async removeById(id: string): Promise<number> {
    const db = await this.#load();
    const before = db.memories.length;
    db.memories = db.memories.filter((m) => m.id !== id);
    await this.#save(db);
    return before - db.memories.length;
  }

  async listByUser(userId: string): Promise<Memory[]> {
    const db = await this.#load();
    return db.memories.filter((m) => m.userId === userId);
  }

  async wipeUser(userId: string): Promise<void> {
    const db = await this.#load();
    db.memories = db.memories.filter((m) => m.userId !== userId);
    await this.#save(db);
  }

  async #load(): Promise<Db> {
    try {
      const raw = await readFile(this.path, 'utf8');
      return JSON.parse(raw) as Db;
    } catch {
      return { memories: [] };
    }
  }

  async #save(data: Db): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(data, null, 2), 'utf8');
  }
}
