import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonMemoryStore } from '../src/store.js';
import { MemoryEngine } from '../src/engine.js';
import { createNemoClawMemoryPlugin } from '../src/plugin.js';
import { isMemoryWorthy, detectCategory } from '../src/extractor.js';

// ── extractor unit tests ─────────────────────────────────────────────────────

test('isMemoryWorthy rejects trivial messages', () => {
  assert.equal(isMemoryWorthy('ok'), false);
  assert.equal(isMemoryWorthy('thanks'), false);
  assert.equal(isMemoryWorthy('sure!'), false);
  assert.equal(isMemoryWorthy('Got it'), false);
  assert.equal(isMemoryWorthy('sounds good'), false);
  assert.equal(isMemoryWorthy(''), false);
  assert.equal(isMemoryWorthy('hi'), false); // too short
});

test('isMemoryWorthy accepts meaningful messages', () => {
  assert.equal(isMemoryWorthy('I prefer dark mode in all editors'), true);
  assert.equal(isMemoryWorthy('Remember this: my API key rotates monthly'), true);
  assert.equal(isMemoryWorthy('Important: always use snake_case for variables'), true);
  assert.equal(isMemoryWorthy('I work from New York, EST timezone'), true);
  assert.equal(isMemoryWorthy('We are building a payments feature for Q2'), true);
  assert.equal(isMemoryWorthy('I enjoy writing in TypeScript'), true);
  assert.equal(isMemoryWorthy('Keep in mind I dislike verbose logs'), true);
});

test('detectCategory classifies correctly', () => {
  assert.equal(detectCategory('I love using Vim keybindings'), 'preference');
  assert.equal(detectCategory('My name is Alex and I live in Berlin'), 'profile');
  assert.equal(detectCategory('The project deadline is end of month'), 'project');
  assert.equal(detectCategory('Remember this important detail for later'), 'general');
  assert.equal(detectCategory('Note that I prefer dark mode'), 'preference');
});

// ── JsonMemoryStore unit tests ───────────────────────────────────────────────

test('JsonMemoryStore insert and listByUser', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-store-'));
  try {
    const store = new JsonMemoryStore(join(dir, 'memory.json'));
    const m1 = await store.insert({ userId: 'u1', sessionId: 's1', text: 'I prefer tabs over spaces', category: 'preference' });
    const m2 = await store.insert({ userId: 'u1', sessionId: 's1', text: 'I work in London', category: 'profile' });
    await store.insert({ userId: 'u2', sessionId: 's2', text: 'Other user data', category: 'general' });

    assert.ok(m1.id, 'memory has an id');
    assert.ok(m1.createdAt, 'memory has a createdAt');
    assert.ok(Array.isArray(m1.embedding), 'memory has an embedding');

    const u1Memories = await store.listByUser('u1');
    assert.equal(u1Memories.length, 2);
    assert.ok(u1Memories.some((m) => m.id === m1.id));
    assert.ok(u1Memories.some((m) => m.id === m2.id));

    const u2Memories = await store.listByUser('u2');
    assert.equal(u2Memories.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JsonMemoryStore removeById', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-store-'));
  try {
    const store = new JsonMemoryStore(join(dir, 'memory.json'));
    const m = await store.insert({ userId: 'u1', sessionId: 's1', text: 'I enjoy cycling on weekends', category: 'preference' });

    const removed = await store.removeById(m.id);
    assert.equal(removed, 1);

    const remaining = await store.listByUser('u1');
    assert.equal(remaining.length, 0);

    // Removing a non-existent id returns 0
    const none = await store.removeById('does-not-exist');
    assert.equal(none, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── MemoryEngine deduplication ───────────────────────────────────────────────

test('engine skips near-duplicate memories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-dedup-'));
  try {
    const store = new JsonMemoryStore(join(dir, 'memory.json'));
    const engine = new MemoryEngine(store, { minSimilarity: 0.1 });

    await engine.captureTurn({
      userId: 'u1',
      sessionId: 's1',
      userMessage: 'I prefer dark mode in all my editors.',
      assistantMessage: '',
    });

    // Exact same message again — should be deduplicated
    await engine.captureTurn({
      userId: 'u1',
      sessionId: 's1',
      userMessage: 'I prefer dark mode in all my editors.',
      assistantMessage: '',
    });

    const memories = await store.listByUser('u1');
    assert.equal(memories.length, 1, 'duplicate should not be stored');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── forget via engine ────────────────────────────────────────────────────────

test('engine forget removes memory by id', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-forget-'));
  try {
    const store = new JsonMemoryStore(join(dir, 'memory.json'));
    const engine = new MemoryEngine(store, { minSimilarity: 0.1 });

    const [mem] = await engine.captureTurn({
      userId: 'u1',
      sessionId: 's1',
      userMessage: 'I prefer light theme in IDEs.',
      assistantMessage: '',
    });

    assert.ok(mem, 'memory was captured');
    const removed = await engine.forget({ memoryId: mem.id });
    assert.equal(removed, 1);

    const remaining = await store.listByUser('u1');
    assert.equal(remaining.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── plugin tool validation ───────────────────────────────────────────────────

test('plugin tool handlers reject missing required fields', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-validate-'));
  const registeredTools = new Map();
  const host = {
    registerTool(name, handler) { registeredTools.set(name, handler); },
    onBeforeAssistantTurn() {},
    onAfterAssistantTurn() {},
  };

  try {
    const plugin = createNemoClawMemoryPlugin({ storePath: join(dir, 'memory.json') });
    await plugin.setup(host);

    await assert.rejects(
      () => registeredTools.get('memory_store')({ text: 'hello world' }),
      /userId/
    );
    await assert.rejects(
      () => registeredTools.get('memory_store')({ userId: 'u1', text: '' }),
      /text/
    );
    await assert.rejects(
      () => registeredTools.get('memory_search')({ userId: 'u1', query: '' }),
      /query/
    );
    await assert.rejects(
      () => registeredTools.get('memory_forget')({}),
      /memoryId/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── original integration tests ───────────────────────────────────────────────

test('captures and recalls preference memory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-memory-'));
  try {
    const store = new JsonMemoryStore(join(dir, 'memory.json'));
    const engine = new MemoryEngine(store, { minSimilarity: 0.1 });

    await engine.captureTurn({
      userId: 'u1',
      sessionId: 's1',
      userMessage: 'Remember this: I prefer dark mode and concise answers.',
      assistantMessage: 'Got it.',
    });

    const recalled = await engine.recall({
      userId: 'u1',
      query: 'What UI theme does the user like?',
    });

    assert.ok(recalled.length >= 1);
    assert.match(recalled[0].text, /prefer dark mode/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('plugin registers tools and injects memory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nemoclaw-memory-'));
  const registeredTools = new Map();
  const beforeHooks = [];
  const afterHooks = [];

  const host = {
    registerTool(name, handler) {
      registeredTools.set(name, handler);
    },
    onBeforeAssistantTurn(handler) {
      beforeHooks.push(handler);
    },
    onAfterAssistantTurn(handler) {
      afterHooks.push(handler);
    },
  };

  try {
    const plugin = createNemoClawMemoryPlugin({ storePath: join(dir, 'memory.json'), minSimilarity: 0.1 });
    await plugin.setup(host);

    assert.equal(registeredTools.has('memory_store'), true);
    assert.equal(registeredTools.has('memory_search'), true);
    assert.equal(registeredTools.has('memory_forget'), true);

    await afterHooks[0]({
      userId: 'u2',
      sessionId: 's2',
      userMessage: 'I work from New York and my timezone is EST.',
      assistantMessage: 'Noted.',
    });

    let injected = '';
    await beforeHooks[0]({
      userId: 'u2',
      userMessage: 'Where does the user work from?',
      injectSystem(text) {
        injected = text;
      },
    });

    assert.match(injected, /long-term memory/i);
    assert.match(injected, /New York/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
