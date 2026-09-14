import fs from 'node:fs/promises';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_SIZE = 22;
const CENTRAL_HEADER_SIZE = 46;
const MAX_COMMENT_SIZE = 0xffff;
// The EOCD record and its trailing comment always fit in this many final bytes.
const MAX_TAIL_SIZE = EOCD_SIZE + MAX_COMMENT_SIZE;

/**
 * Finds the end-of-central-directory record in `tail`, the last bytes of an
 * archive of `archiveSize` bytes, and returns where its central directory is.
 *
 * A candidate signature only counts when its comment length reaches exactly
 * to the end of the archive, so a "PK\x05\x06" inside a comment is skipped.
 * Returns null for anything this reader does not handle: no EOCD, split
 * archives, zip64 markers, or a directory that is not wholly before the EOCD.
 */
function locateCentralDirectory(tail, archiveSize) {
  const tailStart = archiveSize - tail.length;
  for (let i = tail.length - EOCD_SIZE; i >= 0; i--) {
    if (tail.readUInt32LE(i) !== EOCD_SIGNATURE) continue;
    const commentLength = tail.readUInt16LE(i + 20);
    if (i + EOCD_SIZE + commentLength !== tail.length) continue;

    const eocdOffset = tailStart + i;
    const diskNumber = tail.readUInt16LE(i + 4);
    const directoryDisk = tail.readUInt16LE(i + 6);
    const entriesOnDisk = tail.readUInt16LE(i + 8);
    const entryCount = tail.readUInt16LE(i + 10);
    const size = tail.readUInt32LE(i + 12);
    const offset = tail.readUInt32LE(i + 16);

    if (diskNumber !== 0 || directoryDisk !== 0 || entriesOnDisk !== entryCount) return null;
    if (entryCount === 0xffff || size === 0xffffffff || offset === 0xffffffff) return null;
    if (offset + size > eocdOffset) return null;
    return { offset, size, entryCount };
  }
  return null;
}

/**
 * Reads entry names from a central directory buffer that holds exactly
 * `entryCount` records. Returns null when any record, name, extra field or
 * comment would run past the directory, or when bytes are left over.
 */
function parseCentralDirectory(directory, entryCount) {
  const names = [];
  let offset = 0;
  for (let i = 0; i < entryCount; i++) {
    if (offset + CENTRAL_HEADER_SIZE > directory.length) return null;
    if (directory.readUInt32LE(offset) !== CENTRAL_HEADER_SIGNATURE) return null;
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    const nameStart = offset + CENTRAL_HEADER_SIZE;
    const recordEnd = nameStart + nameLength + extraLength + commentLength;
    if (recordEnd > directory.length) return null;
    names.push(directory.toString('utf8', nameStart, nameStart + nameLength));
    offset = recordEnd;
  }
  return offset === directory.length ? names : null;
}

/**
 * Lists entry names from a complete zip archive held in memory.
 *
 * Returns null when the buffer is not a zip this reader handles (for example
 * a JSON package, a zip64 or split archive, or a malformed directory), so
 * callers can leave validation of those files to the server.
 */
export function listZipEntryNames(buffer) {
  if (buffer.length < EOCD_SIZE) return null;
  const tail = buffer.subarray(Math.max(0, buffer.length - MAX_TAIL_SIZE));
  const directory = locateCentralDirectory(tail, buffer.length);
  if (!directory) return null;
  return parseCentralDirectory(
    buffer.subarray(directory.offset, directory.offset + directory.size),
    directory.entryCount,
  );
}

/**
 * Lists entry names from a zip archive on disk, reading only the final
 * bytes that can hold the EOCD record and then the central directory itself.
 * Returns null under the same conditions as listZipEntryNames.
 */
export async function readZipEntryNames(file) {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    if (size < EOCD_SIZE) return null;

    const tailLength = Math.min(size, MAX_TAIL_SIZE);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);
    const directory = locateCentralDirectory(tail, size);
    if (!directory) return null;

    const region = Buffer.alloc(directory.size);
    const { bytesRead } = await handle.read(region, 0, directory.size, directory.offset);
    if (bytesRead !== directory.size) return null;
    return parseCentralDirectory(region, directory.entryCount);
  } finally {
    await handle.close();
  }
}
