import { fetchOwnedSpaces, fetchThreads } from './fetch.js';
import { loadConfig } from './config.js';

export function filterItems(items, query, keys) {
  const terms = (query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter((item) => {
    const hay = keys.map((k) => String(item[k] ?? '')).join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export async function spacesForPrompt(filter = '', { limit = 4, offset = 0 } = {}) {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) {
    throw new Error('Run mantis-setup first (API key + URL).');
  }
  const all = filterItems(
    await fetchOwnedSpaces(cfg.apiBaseUrl, cfg.apiKey),
    filter,
    ['name', 'id'],
  );
  const page = all.slice(offset, offset + limit);
  return {
    spaces: page,
    total: all.length,
    offset,
    limit,
    hasMore: offset + limit < all.length,
    filter,
  };
}

export async function threadsForPrompt(filter = '', { limit = 4, offset = 0 } = {}) {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) throw new Error('Run mantis-setup first.');
  if (!cfg.spaceId) throw new Error('Pick a space first (/mantis:space).');

  const all = filterItems(
    await fetchThreads(cfg.apiBaseUrl, cfg.apiKey, cfg.spaceId),
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
