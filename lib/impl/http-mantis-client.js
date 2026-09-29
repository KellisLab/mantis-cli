import { normalizeBaseUrl } from '../utils/url.js';

function formatApiError(data, res) {
  const raw = data.detail || data.message || data.error || res.statusText || `HTTP ${res.status}`;
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

  _clearApproval() {
    if (typeof this.configStore.load !== 'function' || typeof this.configStore.save !== 'function') return;
    const cfg = this.configStore.load();
    if (!cfg.approvalToken && !cfg.approvalExpiresAt) return;
    delete cfg.approvalToken;
    delete cfg.approvalExpiresAt;
    this.configStore.save(cfg);
  }

  _responseError(data, res) {
    const error = new Error(formatApiError(data, res));
    error.status = res.status;
    error.code = typeof data.code === 'string' ? data.code
      : typeof data.error === 'string' ? data.error : undefined;
    if (typeof data.hint === 'string') error.hint = data.hint;
    if (res.status === 401 || res.status === 403) this._clearApproval();
    return error;
  }

  async request(method, pathname, { params, body, timeoutMs, redirect, approval = true } = {}) {
    const { apiBaseUrl, apiKey, approvalToken } = this._credentials();
    const root = normalizeBaseUrl(apiBaseUrl);
    const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, `${root}/`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== '') url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url, {
      method,
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      ...(redirect ? { redirect } : {}),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(approval && approvalToken ? { 'X-Mantis-Approval': approvalToken } : {}),
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
      throw this._responseError(data, res);
    }
    return data;
  }

  listSpaces({ scope = 'accessible', limit = 20, offset = 0, q, space_id } = {}) {
    return this.request('GET', '/api/v1/me/spaces/', {
      params: { scope, limit, offset, q, space_id },
    });
  }

  getKeyStatus() {
    return this.request('GET', '/api/v1/keys/self/');
  }

  unlockDestructive() {
    return this.request('POST', '/api/v1/keys/session/unlock/', { approval: false });
  }

  async lockDestructive() {
    try {
      return await this.request('POST', '/api/v1/keys/session/lock/');
    } finally {
      this._clearApproval();
    }
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

  projectToMap(mapId, { text, embedding, serviceName, model, persist } = {}) {
    const body = {};
    if (text != null) body.text = text;
    if (embedding != null) body.embedding = embedding;
    if (serviceName) body.service_name = serviceName;
    if (model) body.model = model;
    if (persist != null) body.persist = Boolean(persist);
    return this.request('POST', `/api/v1/spaces/${encodeURIComponent(mapId)}/projection/`, { body });
  }

  /**
   * Export the rows behind a Mantis URI as parquet bytes.
   * Returns { data: Buffer, rows, fields } on success.
   * Throws on HTTP error, surfacing the server's structured error body.
   */
  async exportUri({ uri, spaceStateId, fields, includeEmbedding = false }) {
    const { apiBaseUrl, apiKey, approvalToken } = this._credentials();
    if (!spaceStateId) {
      throw new Error('No thread configured. Run: mantis setup or mantis select thread');
    }
    const root = normalizeBaseUrl(apiBaseUrl);
    const url = new URL('/api/v1/me/export/', `${root}/`);
    const body = { uri, space_state_id: String(spaceStateId), include_embedding: Boolean(includeEmbedding) };
    if (fields && fields.length) body.fields = fields;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(approvalToken ? { 'X-Mantis-Approval': approvalToken } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/vnd.apache.parquet, application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // error responses are JSON; reuse the shared formatter.
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || res.statusText };
      }
      throw this._responseError(data, res);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const rows = Number(res.headers.get('x-mantis-rows')) || 0;
    const fieldsHeader = res.headers.get('x-mantis-fields') || '';
    return { data: buf, rows, fields: fieldsHeader ? fieldsHeader.split(',') : [] };
  }

  async createMapInSpace(spaceId, { file, mapName, dataTypes, selectedFields, fieldWeights }) {
    const { apiBaseUrl, apiKey, approvalToken } = this._credentials();
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
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(approvalToken ? { 'X-Mantis-Approval': approvalToken } : {}) },
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
      throw this._responseError(data, res);
    }
    return data;
  }

  async installExtensionInSpace(spaceId, file) {
    const { apiBaseUrl, apiKey, approvalToken } = this._credentials();
    const root = normalizeBaseUrl(apiBaseUrl);
    const url = new URL(`/api/v1/spaces/${encodeURIComponent(spaceId)}/extensions/`, `${root}/`);
    const form = new FormData();
    const bytes = await import('node:fs/promises').then((fs) => fs.readFile(file));
    const name = await import('node:path').then((p) => p.basename(file));
    form.set('package', new Blob([bytes]), name);

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(approvalToken ? { 'X-Mantis-Approval': approvalToken } : {}) },
      body: form,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || res.statusText };
    }
    if (!res.ok) throw this._responseError(data, res);
    return data;
  }
}
