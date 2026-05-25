export function filterItems(items, query, keys) {
  const terms = (query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter((item) => {
    const hay = keys.map((k) => String(item[k] ?? '')).join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export class QueryService {
  constructor({ configStore, spaces }) {
    this.configStore = configStore;
    this.spaces = spaces;
  }

  async spacesForPrompt(filter = '', { limit = 4, offset = 0 } = {}) {
    this.configStore.requireAuth();
    const page = await this.spaces.search({ q: filter, limit, offset });
    return {
      spaces: page.spaces || [],
      total: page.total,
      offset,
      limit,
      hasMore: offset + limit < page.total,
      filter,
    };
  }

  async threadsForPrompt(filter = '', { limit = 4, offset = 0 } = {}) {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceId) throw new Error('Pick a space first (mantis select space).');

    const all = filterItems(
      await this.spaces.fetchThreads(cfg.spaceId),
      filter,
      ['name', 'id'],
    );
    const page = all.slice(offset, offset + limit);
    return {
      threads: page,
      total: all.length,
      offset,
      limit,
      hasMore: offset + limit < all.length,
      spaceId: cfg.spaceId,
      spaceName: cfg.spaceName,
      filter,
    };
  }
}
