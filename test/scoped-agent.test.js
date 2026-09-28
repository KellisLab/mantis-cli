import assert from 'node:assert/strict';
import test from 'node:test';

import { ContextService } from '../lib/services/context-service.js';
import { HttpMantisClient } from '../lib/impl/http-mantis-client.js';
import { SelectionService } from '../lib/services/selection-service.js';
import { ToolService } from '../lib/services/tool-service.js';

function configStore(initial = {}) {
  let value = { ...initial };
  return {
    load: () => ({ ...value }),
    save: (next) => { value = { ...next }; },
    requireAuth: () => ({ ...value }),
    configPath: () => '/tmp/mantis.json',
  };
}

test('unlock stores the opaque approval token, status reports scope, and lock clears it', async () => {
  const store = configStore({ apiBaseUrl: 'https://api.example', apiKey: 'secret' });
  const service = new ContextService({
    configStore: store,
    ui: { promptConfirm: async () => true },
    client: {
      getKeyStatus: async () => ({ access_mode: 'read_write', capabilities: ['points.read'], destructive_unlocked: false }),
      unlockDestructive: async () => ({ approval_token: 'opaque-token', destructive_unlocked: true }),
      lockDestructive: async () => ({ destructive_unlocked: false }),
    },
  });

  const status = await service.status();
  assert.deepEqual([status.accessMode, status.capabilities, status.destructiveUnlocked], ['read_write', ['points.read'], false]);
  assert.deepEqual(await service.unlock({ yes: true }), { destructive_unlocked: true });
  assert.equal(store.load().approvalToken, 'opaque-token');
  assert.deepEqual(await service.lock(), { destructive_unlocked: false });
  assert.equal(store.load().approvalToken, undefined);
});

test('listPoints validates and forwards the canonical MCP contract', async () => {
  const calls = [];
  const tools = new ToolService({ mcp: { callTool: async (...args) => { calls.push(args); return { points: [], next_cursor: null, has_more: false }; } } });
  const result = await tools.listPoints('mantis://map/m1', { cursor: 'next', limit: 25, fields: 'title,score' });
  assert.deepEqual(calls, [['list_points', { uri: 'mantis://map/m1', cursor: 'next', limit: 25, fields: ['title', 'score'] }]]);
  assert.equal(result.has_more, false);
  assert.throws(() => tools.listPoints('mantis://map/m1', { limit: 101 }), /1 to 100/);
});

test('non-interactive duplicate space names require a UUID', async () => {
  const prior = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
  try {
    const service = new SelectionService({
      configStore: { requireAuth: () => ({}) },
      spaces: { search: async () => ({ spaces: [{ id: 'a', name: 'Same' }, { id: 'b', name: 'Same' }], total: 2 }) },
      client: {},
      ui: { die: (message) => { throw new Error(message); } },
    });
    await assert.rejects(service.pickSpace('Same'), /ambiguous.*UUID/i);
  } finally {
    Object.defineProperty(process.stdin, 'isTTY', { value: prior, configurable: true });
  }
});

test('HTTP requests carry approval and clear it on structured authorization errors', async () => {
  const store = configStore({ apiBaseUrl: 'https://api.example', apiKey: 'secret', approvalToken: 'approval' });
  const originalFetch = globalThis.fetch;
  let headers;
  globalThis.fetch = async (_url, options) => {
    headers = options.headers;
    return new Response(JSON.stringify({ error: 'approval_required', detail: 'Unlock first.', hint: 'mantis unlock' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const client = new HttpMantisClient(store);
    await assert.rejects(client.request('DELETE', '/resource/'), (error) => {
      assert.deepEqual([error.status, error.code, error.message, error.hint], [403, 'approval_required', 'Unlock first.', 'mantis unlock']);
      return true;
    });
    assert.equal(headers['X-Mantis-Approval'], 'approval');
    assert.equal(store.load().approvalToken, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
