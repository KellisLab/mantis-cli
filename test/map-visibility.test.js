import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpMantisClient } from '../lib/impl/http-mantis-client.js';
import { MapService } from '../lib/services/map-service.js';

test('Space creation sends the backend visibility contract', async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: 'new-space' }), { status: 201 });
  };
  try {
    const client = new HttpMantisClient({ requireAuth: () => ({ apiBaseUrl: 'https://example.test', apiKey: 'key' }) });
    await client.createSpace({ name: 'Private' });
    await client.createSpace({ name: 'Unlisted', isUnlisted: true });
    assert.deepEqual(bodies, [
      { name: 'Private', visibility: 'private' },
      { name: 'Unlisted', visibility: 'unlisted' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CLI refuses unsupported public Space creation before upload', async () => {
  const service = new MapService({ configStore: { requireAuth: () => ({}) },
    csvReader: { readHeaders: () => ['title'] }, ui: { info: () => {} } });
  await assert.rejects(service.createMap('input.csv', {
    mapName: 'Map', spaceMode: 'new', spaceName: 'Space', public: true,
  }), /cannot create public Spaces/);
});
