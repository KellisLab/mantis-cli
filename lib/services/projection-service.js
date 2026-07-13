import { parseSpaceIdFromInput } from '../utils/space-id.js';

/**
 * Projects text (or an embedding) onto a map via the developer API and, when
 * persisting, returns the new point's Mantis URI. Thin wrapper over
 * client.projectToMap — the backend does the embedding + projection.
 */
export class ProjectionService {
  constructor({ configStore, client }) {
    this.configStore = configStore;
    this.client = client;
  }

  async project(text, { mapId, embedding, serviceName, model, persist = true } = {}) {
    this.configStore.requireAuth();

    const resolvedMapId = parseSpaceIdFromInput(mapId);
    if (!resolvedMapId) {
      throw new Error('A --map-id is required (a map UUID or a Mantis link).');
    }
    if (!text && !embedding) {
      throw new Error("Provide text to project, or an --embedding.");
    }

    return this.client.projectToMap(resolvedMapId, {
      text,
      embedding,
      serviceName,
      model,
      persist,
    });
  }
}
