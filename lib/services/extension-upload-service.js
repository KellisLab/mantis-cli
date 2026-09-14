import fs from 'node:fs';

import { parseSpaceIdFromInput } from '../utils/space-id.js';
import { readZipEntryNames } from '../utils/zip-entries.js';

/**
 * The zip format requires "/" in entry names. Archives built with a "\"
 * separator (for example by .NET's ZipFile in Windows PowerShell 5.1) are
 * rejected by the API with only "Invalid extension package", so they are
 * caught here with the cause and the fix.
 */
async function assertForwardSlashEntries(file) {
  const names = await readZipEntryNames(file);
  if (!names) return;
  const offending = names.filter((name) => name.includes('\\'));
  if (offending.length === 0) return;
  const shown = offending.slice(0, 3).join(', ');
  const more = offending.length > 3 ? ` and ${offending.length - 3} more` : '';
  throw new Error(
    `Extension package has entries with backslash paths (${shown}${more}). `
    + 'Mantis rejects these as "Invalid extension package". '
    + 'Re-create the archive with forward slashes ("/") in entry names, as the zip format requires.',
  );
}

/** Uploads an extension package through the developer API. */
export class ExtensionUploadService {
  constructor({ configStore, client }) {
    this.configStore = configStore;
    this.client = client;
  }

  async install(file, { spaceId } = {}) {
    this.configStore.requireAuth();

    const resolvedSpaceId = parseSpaceIdFromInput(spaceId);
    if (!resolvedSpaceId) {
      throw new Error('space_id is required (a space UUID or a Mantis link).');
    }
    if (!file) throw new Error('file is required (a .mantisx, .zip, or JSON package).');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`Extension package not found: ${file}`);
    }
    await assertForwardSlashEntries(file);

    const result = await this.client.installExtensionInSpace(resolvedSpaceId, file);
    const bundle = result.bundle;
    return {
      extension_id: result.extension_id,
      version: result.version,
      space_id: result.space_id,
      scope: result.scope,
      ...(bundle ? {
        manifest: bundle.manifest,
        enabled: bundle.enabled,
        has_backend: bundle.has_backend,
      } : {}),
    };
  }
}
