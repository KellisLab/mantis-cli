import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ExtensionUploadService } from '../lib/services/extension-upload-service.js';
import { ToolService } from '../lib/services/tool-service.js';

const SPACE_ID = '4c9beaf7-85db-4648-b5f6-bb2acdea48dd';

// Minimal stored (uncompressed) zip with the given entry names. The CRC fields
// are left at zero because only the entry names are read.
function makeZip(names) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const name of names) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from('x');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localBlock = Buffer.concat([local, nameBuf, data]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(localBlock);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localBlock.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(names.length, 8);
  eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, eocd]);
}

function writeTempPackage(t, name, contents) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantis-extension-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const file = path.join(tempDir, name);
  fs.writeFileSync(file, contents);
  return file;
}

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

test('rejects a zip with backslash entry names before making an API request', async (t) => {
  const file = writeTempPackage(
    t,
    'windows.mantisx',
    makeZip(['mantis.extension.json', 'extension.js', 'panel\\main.js']),
  );
  const service = new ExtensionUploadService({
    configStore: { requireAuth: () => ({ apiKey: 'test' }) },
    client: {
      installExtensionInSpace: async () => assert.fail('client should not be called'),
    },
  });

  await assert.rejects(
    service.install(file, { spaceId: SPACE_ID }),
    (err) => {
      assert.match(err.message, /backslash paths \(panel\\main\.js\)/);
      assert.match(err.message, /forward slashes/);
      return true;
    },
  );
});

test('uploads a zip whose entry names use forward slashes', async (t) => {
  const file = writeTempPackage(
    t,
    'portable.mantisx',
    makeZip(['mantis.extension.json', 'extension.js', 'panel/main.js']),
  );
  let called = false;
  const service = new ExtensionUploadService({
    configStore: { requireAuth: () => ({ apiKey: 'test' }) },
    client: {
      installExtensionInSpace: async (spaceId) => {
        called = true;
        return { extension_id: 'demo.extension', version: '1.0.0', space_id: spaceId, scope: 'user' };
      },
    },
  });

  const result = await service.install(file, { spaceId: SPACE_ID });
  assert.equal(called, true);
  assert.equal(result.extension_id, 'demo.extension');
});
