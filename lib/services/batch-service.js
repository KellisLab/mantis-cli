import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function save(file, state) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export async function submitBatch(manifestFile, map, { stateFile = `${manifestFile}.state.json` } = {}) {
  const raw = fs.readFileSync(manifestFile);
  const manifest = JSON.parse(raw.toString('utf8'));
  if (!UUID.test(manifest.space_id || '') || !Array.isArray(manifest.maps)
      || manifest.maps.length < 1 || manifest.maps.length > 100) {
    throw new Error('Batch needs a space_id UUID and 1–100 maps.');
  }
  const entries = manifest.maps.map((entry) => {
    if (!entry || typeof entry.file !== 'string' || !entry.file.trim()
        || typeof entry.map_name !== 'string' || !entry.map_name.trim()
        || (entry.data_types !== undefined && !Array.isArray(entry.data_types))) {
      throw new Error('Each map needs file and map_name; data_types must be an array if provided.');
    }
    const file = path.resolve(path.dirname(manifestFile), entry.file);
    if (path.extname(file).toLowerCase() !== '.csv' || !fs.statSync(file).isFile()) {
      throw new Error(`Batch supports local CSV files only: ${entry.file}`);
    }
    return { file, map_name: entry.map_name, data_types: entry.data_types };
  });

  const lockFile = `${stateFile}.lock`;
  const lock = fs.openSync(lockFile, 'wx', 0o600);
  try {
    const manifestHash = createHash('sha256').update(raw).digest('hex');
    const state = fs.existsSync(stateFile)
      ? JSON.parse(fs.readFileSync(stateFile, 'utf8'))
      : { schema: 'mantis.batch/v1', manifest_hash: manifestHash, space_id: manifest.space_id,
          maps: entries.map(() => ({ status: 'pending' })) };
    if (state.schema !== 'mantis.batch/v1' || state.manifest_hash !== manifestHash
        || state.space_id !== manifest.space_id || state.maps?.length !== entries.length) {
      throw new Error('Batch state does not match this manifest; use the original manifest and state file.');
    }
    for (const [index, entry] of entries.entries()) {
      const record = state.maps[index];
      if (record.status === 'submitted') continue;
      if (record.status !== 'pending') {
        record.status = 'needs_review';
        save(stateFile, state);
        throw new Error(`Map ${index + 1} may already have been submitted. Check the Space before editing ${stateFile} to resume.`);
      }
      record.status = 'submitting';
      save(stateFile, state);
      try {
        const result = await map.createMap(entry.file, {
          spaceMode: 'existing', spaceId: manifest.space_id, spaceName: manifest.space_name || manifest.space_id,
          mapName: entry.map_name, activate: false,
          ...(entry.data_types ? { dataTypes: JSON.stringify(entry.data_types) } : {}),
        });
        record.status = 'submitted';
        record.map_id = result.map_id || null;
        save(stateFile, state);
      } catch (error) {
        record.status = 'needs_review';
        save(stateFile, state);
        throw new Error(`Map ${index + 1} outcome is uncertain; check the Space before resuming. ${error.message}`);
      }
    }
    return { state_file: stateFile, space_id: manifest.space_id, maps: state.maps,
      note: 'Submitted means accepted for map creation, not fully processed.' };
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockFile);
  }
}
