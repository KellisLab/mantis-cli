import { normalizeBaseUrl } from '../utils/url.js';

function formatApiError(data, res) {
  const raw = data.error || data.detail || res.statusText || `HTTP ${res.status}`;
  if (typeof raw === 'string' && /<html/i.test(raw)) {
    if (res.status >= 500) {
      return 'Mantis server error (HTTP 500). If creating a thread, that name may already exist in this space.';
    }
    return `Mantis API error (HTTP ${res.status})`;
  }
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

export class HttpMantisClient {
  constructor(configStore) {
    this.configStore = configStore;
  }

  _credentials() {
    return this.configStore.requireAuth();
  }

  async request(method, pathname, { params, body } = {}) {
    const { apiBaseUrl, apiKey } = this._credentials();
    const root = normalizeBaseUrl(apiBaseUrl);
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
      throw new Error(formatApiError(data, res));
    }
    return data;
  }

  listSpaces({ scope = 'accessible', limit = 20, offset = 0, q, space_id } = {}) {
    return this.request('GET', '/api/v1/me/spaces/', {
      params: { scope, limit, offset, q, space_id },
    });
  }

  listSpaceStates(spaceId, { limit = 20, offset = 0 } = {}) {
    return this.request('GET', '/api/v1/me/space-states/', {
      params: { space_id: spaceId, limit, offset },
    });
  }

  createSpaceState(spaceId, name) {
    return this.request('POST', '/api/v1/me/space-states/', {
      body: { space_id: spaceId, name },
    });
  }

  createSpace({ name, isPublic = false }) {
    return this.request('POST', '/api/v1/spaces/', {
      body: { name, public: Boolean(isPublic) },
    });
  }

  async createMapInSpace(spaceId, { file, mapName, dataTypes, selectedFields, fieldWeights }) {
    const { apiBaseUrl, apiKey } = this._credentials();
    const root = normalizeBaseUrl(apiBaseUrl);
    const url = new URL(`/api/v1/spaces/${encodeURIComponent(spaceId)}/maps/`, `${root}/`);
    const form = new FormData();
    const bytes = await import('node:fs/promises').then((fs) => fs.readFile(file));
    const name = await import('node:path').then((p) => p.basename(file));
    form.set('file', new Blob([bytes]), name);
    if (mapName) form.set('map_name', mapName);
    if (dataTypes) form.set('data_types', JSON.stringify(dataTypes));
    if (selectedFields) form.set('selected_fields', JSON.stringify(selectedFields));
    if (fieldWeights) form.set('field_weights', JSON.stringify(fieldWeights));

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      body: form,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || res.statusText };
    }
    if (!res.ok) {
      throw new Error(formatApiError(data, res));
    }
    return data;
  }
}
