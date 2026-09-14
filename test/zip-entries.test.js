import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listZipEntryNames, readZipEntryNames } from '../lib/utils/zip-entries.js';

const EOCD_SIGNATURE = 0x06054b50;

// Builds a stored (uncompressed) zip with the given entry names and optional
// archive comment. Returns the bytes plus the offsets tests need to corrupt
// specific fields. CRCs are zero because only entry names are read.
function buildZip(names, { comment = Buffer.alloc(0) } = {}) {
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
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(names.length, 8);
  eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(comment.length, 20);
  return {
    buffer: Buffer.concat([...locals, directory, eocd, comment]),
    directoryOffset: offset,
    directorySize: directory.length,
    eocdOffset: offset + directory.length,
  };
}

// A comment that contains a complete-looking EOCD record followed by text.
function commentWithFakeEocd() {
  const fake = Buffer.alloc(22);
  fake.writeUInt32LE(EOCD_SIGNATURE, 0);
  return Buffer.concat([Buffer.from('built by '), fake, Buffer.from(' on Windows')]);
}

function writeTemp(t, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mantis-zip-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'package.mantisx');
  fs.writeFileSync(file, contents);
  return file;
}

test('lists entry names of a valid archive', () => {
  const { buffer } = buildZip(['mantis.extension.json', 'extension.js', 'panel/main.js']);
  assert.deepEqual(listZipEntryNames(buffer), ['mantis.extension.json', 'extension.js', 'panel/main.js']);
});

test('returns an empty list for an empty zip archive', () => {
  assert.deepEqual(listZipEntryNames(buildZip([]).buffer), []);
});

test('returns null for data that is not a zip archive', () => {
  assert.equal(listZipEntryNames(Buffer.from('{"manifest":{}}')), null);
  assert.equal(listZipEntryNames(Buffer.alloc(0)), null);
});

test('ignores a fake EOCD signature inside the archive comment', () => {
  const { buffer } = buildZip(['extension.js', 'panel\\main.js'], { comment: commentWithFakeEocd() });
  assert.deepEqual(listZipEntryNames(buffer), ['extension.js', 'panel\\main.js']);
});

test('returns null when a filename runs past the central directory', () => {
  const { buffer, directoryOffset } = buildZip(['panel/main.js']);
  buffer.writeUInt16LE(200, directoryOffset + 28);
  assert.equal(listZipEntryNames(buffer), null);
});

test('returns null when the extra field or comment runs past the central directory', () => {
  const extra = buildZip(['panel/main.js']);
  extra.buffer.writeUInt16LE(50, extra.directoryOffset + 30);
  assert.equal(listZipEntryNames(extra.buffer), null);

  const comment = buildZip(['panel/main.js']);
  comment.buffer.writeUInt16LE(50, comment.directoryOffset + 32);
  assert.equal(listZipEntryNames(comment.buffer), null);
});

test('returns null when a central directory record is truncated', () => {
  const { buffer, eocdOffset } = buildZip(['panel/main.js']);
  buffer.writeUInt32LE(40, eocdOffset + 12);
  assert.equal(listZipEntryNames(buffer), null);
});

test('returns null when the entry count exceeds the records present', () => {
  const { buffer, eocdOffset } = buildZip(['panel/main.js']);
  buffer.writeUInt16LE(2, eocdOffset + 8);
  buffer.writeUInt16LE(2, eocdOffset + 10);
  assert.equal(listZipEntryNames(buffer), null);
});

test('returns null when the central directory size is wrong', () => {
  const tooLarge = buildZip(['panel/main.js']);
  tooLarge.buffer.writeUInt32LE(tooLarge.directorySize + 10, tooLarge.eocdOffset + 12);
  assert.equal(listZipEntryNames(tooLarge.buffer), null);

  const leftover = buildZip(['panel/main.js']);
  leftover.buffer.writeUInt32LE(leftover.directorySize + 4, leftover.eocdOffset + 12);
  leftover.buffer.writeUInt32LE(leftover.directoryOffset - 4, leftover.eocdOffset + 16);
  assert.equal(listZipEntryNames(leftover.buffer), null);
});

test('returns null when the central directory offset is out of bounds', () => {
  const { buffer, eocdOffset } = buildZip(['panel/main.js']);
  buffer.writeUInt32LE(1000, eocdOffset + 16);
  assert.equal(listZipEntryNames(buffer), null);
});

test('reads entry names from a file without loading the whole archive', async (t) => {
  // A maximum-length comment puts the central directory outside the tail read.
  const comment = Buffer.alloc(0xffff, 'x');
  const { buffer } = buildZip(['extension.js', 'panel\\main.js'], { comment });
  const file = writeTemp(t, buffer);
  assert.deepEqual(await readZipEntryNames(file), ['extension.js', 'panel\\main.js']);
});

test('file reader matches the buffer reader for fake signatures and non-zip files', async (t) => {
  const { buffer } = buildZip(['panel\\main.js'], { comment: commentWithFakeEocd() });
  assert.deepEqual(await readZipEntryNames(writeTemp(t, buffer)), ['panel\\main.js']);
  assert.equal(await readZipEntryNames(writeTemp(t, '{"manifest":{}}')), null);
});
