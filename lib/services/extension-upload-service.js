import fs from 'node:fs';

import { parseSpaceIdFromInput } from '../utils/space-id.js';

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
