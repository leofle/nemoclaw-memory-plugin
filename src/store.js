import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { embedText } from './embedding.js';

export class JsonMemoryStore {
  constructor(path) {
    this.path = path;
  }

  async insert(input) {
    const db = await this.#load();
    const memory = {
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

  async removeById(id) {
    const db = await this.#load();
    const before = db.memories.length;
    db.memories = db.memories.filter((m) => m.id !== id);
    await this.#save(db);
    return before - db.memories.length;
  }

  async listByUser(userId) {
    const db = await this.#load();
    return db.memories.filter((m) => m.userId === userId);
  }

  async wipeUser(userId) {
    const db = await this.#load();
    db.memories = db.memories.filter((m) => m.userId !== userId);
    await this.#save(db);
  }

  async #load() {
    try {
      const raw = await readFile(this.path, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { memories: [] };
    }
  }

  async #save(data) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(data, null, 2), 'utf8');
  }
}
