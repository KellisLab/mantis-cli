import { createSpaceState, listSpaceStates, listSpaces } from './api.js';

const PAGE = 100;

async function fetchPaginated(fetchPage) {
  const all = [];
  let offset = 0;
  for (;;) {
    const { items, total } = await fetchPage(PAGE, offset);
    const batch = items || [];
    all.push(...batch);
    if (batch.length < PAGE) break;
    if (Number.isFinite(total) && all.length >= total) break;
    offset += PAGE;
  }
  return all;
}

export async function fetchAccessibleSpaces(baseUrl, apiKey) {
  return fetchPaginated(async (limit, offset) => {
    const page = await listSpaces(baseUrl, apiKey, { scope: 'accessible', limit, offset });
    return { items: page.spaces, total: page.total };
  });
}

/** @deprecated use fetchAccessibleSpaces */
export const fetchOwnedSpaces = fetchAccessibleSpaces;

export async function fetchThreads(baseUrl, apiKey, spaceId) {
  return fetchPaginated(async (limit, offset) => {
    const page = await listSpaceStates(baseUrl, apiKey, spaceId, { limit, offset });
    return { items: page.space_states, total: page.total };
  });
}

export { createSpaceState };
