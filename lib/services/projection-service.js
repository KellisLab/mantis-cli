import fs from 'node:fs';

import { parseSpaceIdFromInput } from '../utils/space-id.js';

/**
 * Projects text (or a file's contents, or a raw embedding) onto a map via the
 * developer API and, when persisting, returns the new point's Mantis URI. Thin
 * wrapper over client.projectToMap — the backend does the embedding + projection.
 */
export class ProjectionService {
  constructor({ configStore, client }) {
    this.configStore = configStore;
    this.client = client;
  }

  async project(text, { mapId, file, embedding, serviceName, model, persist = true } = {}) {
    this.configStore.requireAuth();

    const resolvedMapId = parseSpaceIdFromInput(mapId);
    if (!resolvedMapId) {
      throw new Error('map_id is required (a map UUID or a Mantis link).');
    }

    if (text && file) {
      throw new Error('Pass either text or file, not both.');
    }
    let source = text;
    if (file) {
      if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
      source = fs.readFileSync(file, 'utf8');
    }

    if (!source && !embedding) {
      throw new Error('Provide text, a file, or an embedding to project.');
    }

    return this.client.projectToMap(resolvedMapId, {
      text: source,
      embedding,
      serviceName,
      model,
      persist,
    });
  }
}
