/** Supported Composer HTTP controls. Server authentication and scopes are authoritative. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOT = '/api/v1/composer';

function uuid(value, name) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`${name} must be a UUID.`);
  return value.toLowerCase();
}

function integer(value, name, min, max) {
  const parsed = typeof value === 'string' && /^\d{1,16}$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  return parsed;
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function receipt(value, runId) {
  if (!object(value) || value.schema_version !== 1 || !UUID.test(value.runtime_run_id)
      || (runId && value.runtime_run_id !== runId) || typeof value.message_id !== 'string'
      || typeof value.run_phase !== 'string' || typeof value.cancel_phase !== 'string') {
    throw new Error('The server returned an unsupported Composer run receipt. Inspect status before retrying.');
  }
  return value;
}

export class ComposerService {
  constructor({ client }) { this.client = client; }

  async _request(method, route, options = {}) {
    // A timeout can occur after durable acceptance. Never retry a mutation with
    // a fresh identity, follow redirects, or copy a credential into a URL.
    try {
      return await this.client.request(method, `${ROOT}${route}`, {
        ...options, timeoutMs: 30_000, redirect: 'error',
      });
    } catch (error) {
      if (error.status || !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)) throw error;
      const unavailable = new Error('Composer request did not return a confirmed response. Retry run/cancel with the SAME message-id/request-token.');
      unavailable.code = 'composer_response_unconfirmed';
      throw unavailable;
    }
  }

  async access() {
    const result = await this._request('GET', '/access/');
    if (result?.schema !== 'mantis.composer-access/v1') throw new Error('The server does not support the Composer pilot access contract.');
    return result;
  }

  async capabilities() {
    const result = await this._request('GET', '/capabilities/');
    if (result?.type !== 'native_capabilities' || result.schema_version !== 1 || typeof result.model_id !== 'string') {
      throw new Error('The server does not support Composer capabilities.');
    }
    return result;
  }

  async run({ chatId, snapshotId, messageId, message, modelId, effort }) {
    const chat = uuid(chatId, 'chat-id');
    const snapshot = uuid(snapshotId, 'snapshot-id');
    if (typeof messageId !== 'string' || !messageId.trim() || messageId.length > 255 || /[\u0000-\u001f\u007f-\u009f]/.test(messageId)) {
      throw new Error('message-id must be a stable, nonempty identifier of at most 255 characters. Reuse it after an uncertain response.');
    }
    if (typeof message !== 'string' || !message.trim()) throw new Error('A nonempty message is required.');
    if (typeof modelId !== 'string' || !modelId.trim()) throw new Error('Select model-id from mantis composer capabilities.');
    if (effort !== undefined && !['low', 'high', 'max'].includes(effort)) throw new Error('effort must be low, high, or max.');
    const body = { runtime: 'cartographer', chat_id: chat, model_id: modelId, message_id: messageId,
      message, context_snapshot: { version: 1, id: snapshot }, ...(effort ? { reasoning_effort: effort } : {}) };
    const result = receipt(await this._request('POST', '/runs/', { body }));
    if (result.type !== 'native_run_accepted' || result.chat_id !== chat || result.message_id !== messageId
        || result.context_snapshot_id !== snapshot || !['prepared', 'existing'].includes(result.registration)) {
      throw new Error('The accepted receipt does not match this request. Retry with the SAME message-id or inspect the saved run.');
    }
    return result;
  }

  async status(runId) {
    const run = uuid(runId, 'run-id');
    return receipt(await this._request('GET', `/runs/${run}/`), run);
  }

  async events(runId, { after = 0, limit = 100 } = {}) {
    const run = uuid(runId, 'run-id');
    const cursor = integer(after, 'after', 0, Number.MAX_SAFE_INTEGER);
    const size = integer(limit, 'limit', 1, 200);
    const result = receipt(await this._request('GET', `/runs/${run}/events/`, { params: { after_sequence: cursor, limit: size } }), run);
    if (result.schema !== 'mantis.composer-events/v1' || !Array.isArray(result.events) || result.events.length > size
        || result.after_sequence !== cursor || typeof result.has_more !== 'boolean'
        || typeof result.history_incomplete !== 'boolean' || !Array.isArray(result.retention_gaps)) {
      throw new Error('The server returned an unsupported Composer event page.');
    }
    const next = integer(result.next_after_sequence, 'next_after_sequence', cursor, Number.MAX_SAFE_INTEGER);
    let previous = cursor;
    for (const event of result.events) {
      if (!object(event) || event.runtime_run_id !== run || event.message_id !== result.message_id || !UUID.test(event.delivery_id)
          || !Number.isSafeInteger(event.delivery_sequence) || event.delivery_sequence <= previous || event.delivery_sequence > next) {
        throw new Error('The server returned an invalid or unordered Composer delivery frame.');
      }
      previous = event.delivery_sequence;
    }
    if (result.has_more && next <= cursor) throw new Error('The server returned a replay cursor that did not advance.');
    return result;
  }

  async *resume(runId, { after = 0, limit = 100, pages = 10 } = {}) {
    const maxPages = integer(pages, 'pages', 1, 100);
    let cursor = integer(after, 'after', 0, Number.MAX_SAFE_INTEGER);
    for (let index = 0; index < maxPages; index += 1) {
      const page = await this.events(runId, { after: cursor, limit });
      yield page;
      if (!page.has_more) return;
      cursor = page.next_after_sequence;
    }
  }

  async cancel(runId, { requestToken }) {
    const run = uuid(runId, 'run-id');
    const token = uuid(requestToken, 'request-token');
    const result = receipt(await this._request('POST', `/runs/${run}/cancel/`, { body: { request_token: token } }), run);
    if (result.type !== 'native_cancel_state' || (result.request_token !== null && !UUID.test(result.request_token))) {
      throw new Error('The server returned an unsupported cancellation receipt. Reuse the same request-token when retrying.');
    }
    return result;
  }
}
