import { listSpaces } from './api.js';
import { parseSpaceIdFromInput } from './space-id.js';

export async function fetchSpaceById(baseUrl, apiKey, spaceId) {
  const page = await listSpaces(baseUrl, apiKey, {
    scope: 'accessible',
    space_id: spaceId,
    limit: 1,
    offset: 0,
  });
  return page.spaces?.[0] ?? null;
}

export async function resolveSpaceFromInput(baseUrl, apiKey, text) {
  const id = parseSpaceIdFromInput(text);
  if (!id) return null;
  return fetchSpaceById(baseUrl, apiKey, id);
}

/** One page of spaces; optional name/id search — does not load the full catalog. */
export async function searchSpaces(
  baseUrl,
  apiKey,
  { q = '', limit = 20, offset = 0, scope = 'accessible' } = {},
) {
  const id = parseSpaceIdFromInput(q);
  if (id) {
    const one = await fetchSpaceById(baseUrl, apiKey, id);
    return {
      spaces: one ? [one] : [],
      total: one ? 1 : 0,
      limit: 1,
      offset: 0,
    };
  }
  const page = await listSpaces(baseUrl, apiKey, {
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
