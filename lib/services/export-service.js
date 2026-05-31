import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXPORT_SUBDIR = 'mantis_data';

/** Local sandbox dir for exported parquet files: ~/.mantis/mantis_data/ */
export function exportDir() {
  return path.join(os.homedir(), '.mantis', EXPORT_SUBDIR);
}

function suggestFilename(uri, nRows) {
  const tail = String(uri).replace(/\/+$/, '').split('/').pop() || 'export';
  const safe = tail.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return `${safe}_${nRows}rows.parquet`;
}

/**
 * Fetches the parquet behind a Mantis URI from the API and writes it under
 * ~/.mantis/mantis_data/. The CLI-local twin of the in-sandbox `export` MCP
 * tool — same parquet, written to the user's own machine instead of a
 * container.
 */
export class ExportService {
  constructor({ configStore, client }) {
    this.configStore = configStore;
    this.client = client;
  }

  async exportUri(uri, { fields, out, includeEmbedding = false } = {}) {
    if (!uri) throw new Error('A Mantis URI is required (e.g. mantis://map/<id>).');
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceStateId) {
      throw new Error('No thread configured. Run: mantis setup or mantis select thread');
    }

    const { data, rows, fields: cols } = await this.client.exportUri({
      uri,
      spaceStateId: cfg.spaceStateId,
      fields,
      includeEmbedding,
    });

    let name = out ? path.basename(out) : suggestFilename(uri, rows);
    if (!name.endsWith('.parquet')) name += '.parquet';

    const dir = exportDir();
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, name);
    fs.writeFileSync(outPath, data);

    return { path: outPath, rows, fields: cols, format: 'parquet', size_bytes: data.length };
  }
}
