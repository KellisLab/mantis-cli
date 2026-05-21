import { createSpaceState, listSpaceStates, listSpaces } from './api.js';

export async function fetchOwnedSpaces(baseUrl, apiKey) {
  const all = [];
  let offset = 0;
  const limit = 50;
  for (;;) {
    const page = await listSpaces(baseUrl, apiKey, { scope: 'owned', limit, offset });
    all.push(...(page.spaces || []));
    if (all.length >= (page.total ?? 0) || (page.spaces || []).length < limit) break;
    offset += limit;
  }
  return all;
}

export async function fetchThreads(baseUrl, apiKey, spaceId) {
  const all = [];
  let offset = 0;
  const limit = 50;
  for (;;) {
    const page = await listSpaceStates(baseUrl, apiKey, spaceId, { limit, offset });
    all.push(...(page.space_states || []));
    if (all.length >= (page.total ?? 0) || (page.space_states || []).length < limit) break;
    offset += limit;
  }
  return all;
}

export { createSpaceState };
