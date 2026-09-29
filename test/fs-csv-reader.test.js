import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { FsCsvReader } from '../lib/impl/fs-csv-reader.js';

test('reads and trims CSV headers with the patched parser', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantis-csv-'));
  const file = path.join(dir, 'data.csv');
  fs.writeFileSync(file, ' name ,"summary, text",\nMantis,test\n');

  try {
    assert.deepEqual(new FsCsvReader().readHeaders(file), ['name', 'summary, text']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
