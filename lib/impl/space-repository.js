import { API_PAGE } from '../constants.js';
import { parseSpaceIdFromInput } from '../utils/space-id.js';

export class SpaceRepositoryImpl {
  constructor(client) {
    this.client = client;
  }

  async _paginate(fetchPage) {
    const all = [];
    let offset = 0;
    for (;;) {
      const { items, total } = await fetchPage(API_PAGE, offset);
      const batch = items || [];
      all.push(...batch);
      if (batch.length < API_PAGE) break;
      if (Number.isFinite(total) && all.length >= total) break;
      offset += API_PAGE;
    }
    return all;
  }

  async fetchById(spaceId) {
    const page = await this.client.listSpaces({
      scope: 'accessible',
      space_id: spaceId,
      limit: 1,
      offset: 0,
    });
    return page.spaces?.[0] ?? null;
  }

  async resolveFromInput(text) {
    const id = parseSpaceIdFromInput(text);
    if (!id) return null;
    return this.fetchById(id);
  }

  async search({ q = '', limit = 20, offset = 0, scope = 'accessible' } = {}) {
    const id = parseSpaceIdFromInput(q);
    if (id) {
      const one = await this.fetchById(id);
      return { spaces: one ? [one] : [], total: one ? 1 : 0, limit: 1, offset: 0 };
    }
    const page = await this.client.listSpaces({
      scope,
      limit,
      offset,
      q: q.trim() || undefined,
    });
    return {
      spaces: page.spaces || [],
      total: page.total ?? (page.spaces || []).length,
      limit: page.limit ?? limit,
      offset: page.offset ?? offset,
    };
  }

  fetchAccessible() {
    return this._paginate(async (limit, offset) => {
      const page = await this.client.listSpaces({ scope: 'accessible', limit, offset });
      return { items: page.spaces, total: page.total };
    });
  }

  fetchThreads(spaceId) {
    return this._paginate(async (limit, offset) => {
      const page = await this.client.listSpaceStates(spaceId, { limit, offset });
      return { items: page.space_states, total: page.total };
    });
  }
}
