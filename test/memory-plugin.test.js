import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonMemoryStore } from '../src/store.js';
import { MemoryEngine } from '../src/engine.js';
import { createNemoClawMemoryPlugin } from '../src/plugin.js';

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
