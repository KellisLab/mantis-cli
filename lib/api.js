import { normalizeBaseUrl } from './config.js';

async function request(baseUrl, apiKey, method, pathname, { params, body } = {}) {
  const root = normalizeBaseUrl(baseUrl);
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, `${root}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    const msg = data.error || data.detail || res.statusText || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function listSpaces(baseUrl, apiKey, { scope = 'accessible', limit = 20, offset = 0 } = {}) {
  return request(baseUrl, apiKey, 'GET', '/api/v1/me/spaces/', {
    params: { scope, limit, offset },
  });
}

export function listSpaceStates(baseUrl, apiKey, spaceId, { limit = 20, offset = 0 } = {}) {
  return request(baseUrl, apiKey, 'GET', '/api/v1/me/space-states/', {
    params: { space_id: spaceId, limit, offset },
  });
}

export function createSpaceState(baseUrl, apiKey, spaceId, name = 'Claude Code') {
  return request(baseUrl, apiKey, 'POST', '/api/v1/me/space-states/', {
    body: { space_id: spaceId, name },
  });
}
