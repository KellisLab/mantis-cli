import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ExtensionUploadService } from '../lib/services/extension-upload-service.js';
import { ToolService } from '../lib/services/tool-service.js';

const SPACE_ID = '4c9beaf7-85db-4648-b5f6-bb2acdea48dd';

test('installs an extension package into the requested space', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantis-extension-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const file = path.join(tempDir, 'demo.mantisx');
  fs.writeFileSync(file, 'package');

  let received;
  const service = new ExtensionUploadService({
    configStore: { requireAuth: () => ({ apiKey: 'test' }) },
    client: {
      installExtensionInSpace: async (spaceId, packageFile) => {
        received = { spaceId, packageFile };
        return {
          extension_id: 'demo.extension',
          version: '1.0.0',
          space_id: spaceId,
          scope: 'user',
          bundle: {
            manifest: { id: 'demo.extension' },
            enabled: true,
            has_backend: false,
            assets: { 'large.js': 'not returned by the CLI service' },
          },
        };
      },
    },
  });

  const result = await service.install(file, {
    spaceId: `https://mantis.csail.mit.edu/space/${SPACE_ID}`,
  });

  assert.deepEqual(received, { spaceId: SPACE_ID, packageFile: file });
  assert.equal(result.extension_id, 'demo.extension');
  assert.equal(result.scope, 'user');
  assert.deepEqual(result.manifest, { id: 'demo.extension' });
  assert.equal('assets' in result, false);
});

test('registers install_extension as a local tool and dispatches it', async () => {
  let call;
  const tools = new ToolService({
    mcp: { listTools: async () => ({ tools: [] }) },
    exporter: {},
    projection: {},
    extensionUpload: {
      install: async (file, options) => {
        call = { file, options };
        return { extension_id: 'demo.extension' };
      },
    },
  });

  const listed = await tools.listTools();
  assert.ok(listed.tools.some((tool) => tool.name === 'install_extension'));

  const result = await tools.useTool('install_extension', {
    file: 'demo.mantisx',
    space_id: SPACE_ID,
  });
  assert.deepEqual(call, { file: 'demo.mantisx', options: { spaceId: SPACE_ID } });
  assert.deepEqual(result, { extension_id: 'demo.extension' });
});

test('rejects a missing package before making an API request', async () => {
  const service = new ExtensionUploadService({
    configStore: { requireAuth: () => ({ apiKey: 'test' }) },
    client: {
      installExtensionInSpace: async () => assert.fail('client should not be called'),
    },
  });

  await assert.rejects(
    service.install('missing.mantisx', { spaceId: SPACE_ID }),
    /Extension package not found/,
  );
});
