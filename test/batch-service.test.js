import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { submitBatch } from '../lib/services/batch-service.js';

test('batch resumes confirmed submissions but never retries an uncertain upload', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantis-batch-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const manifest = path.join(dir, 'batch.json');
  const spaceId = '11111111-1111-4111-8111-111111111111';
  for (const name of ['a', 'b']) fs.writeFileSync(path.join(dir, `${name}.csv`), 'title,text\nA,Example\n');
  fs.writeFileSync(manifest, JSON.stringify({ space_id: spaceId, maps: [
    { file: 'a.csv', map_name: 'A' }, { file: 'b.csv', map_name: 'B' },
  ] }));
  const calls = [];
  const map = { createMap: async (file, opts) => {
    calls.push({ file, opts });
    if (calls.length === 2) throw new Error('connection lost');
    return { map_id: 'map-a' };
  } };
  await assert.rejects(submitBatch(manifest, map), /outcome is uncertain/);
  const state = JSON.parse(fs.readFileSync(`${manifest}.state.json`, 'utf8'));
  assert.deepEqual(state.maps.map((record) => record.status), ['submitted', 'needs_review']);
  assert.equal(calls[0].opts.spaceId, spaceId);
  assert.equal(calls[0].opts.activate, false);
  await assert.rejects(submitBatch(manifest, map), /may already have been submitted/);
  assert.equal(calls.length, 2);
  state.maps[1].status = 'pending'; // Only after a human verifies B is absent from the Space.
  fs.writeFileSync(`${manifest}.state.json`, JSON.stringify(state));
  const result = await submitBatch(manifest, map);
  assert.equal(result.maps[0].map_id, 'map-a');
  assert.deepEqual(result.maps.map((record) => record.status), ['submitted', 'submitted']);
  assert.equal(calls.length, 3);
  await submitBatch(manifest, map);
  assert.equal(calls.length, 3);
});
