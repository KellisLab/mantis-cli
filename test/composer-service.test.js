import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { HttpMantisClient } from '../lib/impl/http-mantis-client.js';
import { ComposerService } from '../lib/services/composer-service.js';

const RUN = '11111111-1111-4111-8111-111111111111';
const CHAT = '22222222-2222-4222-8222-222222222222';
const SNAPSHOT = '33333333-3333-4333-8333-333333333333';
const TOKEN = '44444444-4444-4444-8444-444444444444';
const base = { schema_version: 1, runtime_run_id: RUN, chat_id: CHAT, message_id: 'stable-request', run_phase: 'active', cancel_phase: 'none' };

async function server(t, handler) {
  const instance = http.createServer(handler);
  instance.listen(0, '127.0.0.1');
  await once(instance, 'listening');
  t.after(() => new Promise((resolve) => instance.close(resolve)));
  const config = { requireAuth: () => ({ apiBaseUrl: `http://127.0.0.1:${instance.address().port}`, apiKey: 'synthetic-test-credential' }) };
  return new ComposerService({ client: new HttpMantisClient(config) });
}

function json(response, value, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(value));
}

async function body(request) {
  const parts = [];
  for await (const part of request) parts.push(part);
  return JSON.parse(Buffer.concat(parts).toString());
}

function page(after, sequence, more = false) {
  return { ...base, schema: 'mantis.composer-events/v1', after_sequence: after, next_after_sequence: sequence,
    has_more: more, history_incomplete: false, retention_gaps: [], events: sequence === after ? [] : [{
      runtime_run_id: RUN, message_id: base.message_id, delivery_id: TOKEN, delivery_sequence: sequence,
      type: 'thinking', content: 'Synthetic diagnostic observation',
    }] };
}

const request = { chatId: CHAT, snapshotId: SNAPSHOT, messageId: 'stable-request', message: 'Inspect synthetic data', modelId: 'configured-model', effort: 'high' };

test('run uses header credentials and exact stable request; delayed dispatch remains accepted', async (t) => {
  const received = [];
  const service = await server(t, async (req, res) => {
    assert.equal(req.url, '/api/v1/composer/runs/');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.authorization, 'Bearer synthetic-test-credential');
    received.push(await body(req));
    json(res, { ...base, type: 'native_run_accepted', registration: received.length > 1 ? 'existing' : 'prepared',
      context_snapshot_id: SNAPSHOT, dispatch_state: 'native_prepared', dispatch_error: { code: 'dispatch_retry_pending', message: 'Accepted; retry pending.' } }, 202);
  });
  const accepted = await service.run(request);
  assert.equal(accepted.runtime_run_id, RUN);
  assert.equal(accepted.dispatch_error.code, 'dispatch_retry_pending');
  assert.equal((await service.run(request)).registration, 'existing');
  assert.deepEqual(received[0], received[1]);
  assert.deepEqual(received[0], { runtime: 'cartographer', chat_id: CHAT, model_id: 'configured-model', message_id: 'stable-request',
    message: 'Inspect synthetic data', context_snapshot: { version: 1, id: SNAPSHOT }, reasoning_effort: 'high' });
});

test('server default deny and revocation errors stay structured and actionable', async (t) => {
  const service = await server(t, (_, res) => json(res, { code: 'native_forbidden', message: 'Pilot access is not permitted.' }, 403));
  await assert.rejects(service.status(RUN), (error) => error.status === 403 && error.code === 'native_forbidden' && error.message === 'Pilot access is not permitted.');
});

test('authenticated Composer transport never follows redirects', async (t) => {
  let redirected = false;
  const service = await server(t, (req, res) => {
    if (req.url === '/redirected') { redirected = true; return json(res, base); }
    res.writeHead(302, { Location: '/redirected' }); res.end();
  });
  await assert.rejects(service.status(RUN));
  assert.equal(redirected, false);
});

test('resume reads bounded pages with the returned cursor and never dispatches', async (t) => {
  const methods = [];
  const service = await server(t, (req, res) => {
    methods.push(req.method);
    const url = new URL(req.url, 'http://example.invalid');
    assert.equal(url.pathname, `/api/v1/composer/runs/${RUN}/events/`);
    const after = Number(url.searchParams.get('after_sequence'));
    json(res, page(after, after + 1, after < 2));
  });
  const results = [];
  for await (const value of service.resume(RUN, { pages: 2 })) results.push(value);
  assert.deepEqual(results.map((value) => value.next_after_sequence), [1, 2]);
  assert.equal(results[1].has_more, true);
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('retention gaps remain explicit instead of reconstructing missing activity', async (t) => {
  const value = { ...page(0, 3), history_incomplete: true, retention_gaps: [{ from_sequence: 1, through_sequence: 2 }] };
  const service = await server(t, (_, res) => json(res, value));
  assert.deepEqual(await service.events(RUN), value);
});

test('cancellation keeps exact token and does not turn pending into stopped', async (t) => {
  const service = await server(t, async (req, res) => {
    assert.equal(req.url, `/api/v1/composer/runs/${RUN}/cancel/`);
    assert.deepEqual(await body(req), { request_token: TOKEN });
    json(res, { ...base, type: 'native_cancel_state', status: 'pending', cancel_phase: 'pending', request_token: TOKEN });
  });
  const result = await service.cancel(RUN, { requestToken: TOKEN });
  assert.equal(result.run_phase, 'active');
  assert.equal(result.status, 'pending');
});

test('invalid request identity and pagination never reach transport', async () => {
  const service = new ComposerService({ client: { request() { assert.fail('Invalid input must not be sent'); } } });
  for (const change of [{ chatId: 'new' }, { snapshotId: 'missing' }, { messageId: '' }, { effort: 'ultra' }, { message: ' ' }, { modelId: '' }]) {
    await assert.rejects(service.run({ ...request, ...change }));
  }
  for (const options of [{ limit: 201 }, { after: -1 }, { after: '1e3' }, { after: true }]) await assert.rejects(service.events(RUN, options));
  await assert.rejects(service.cancel(RUN, { requestToken: 'missing' }));
});

test('changed acceptance and replay identities are rejected', async (t) => {
  let response = { ...base, type: 'native_run_accepted', registration: 'prepared', context_snapshot_id: SNAPSHOT, message_id: 'another-request' };
  const service = await server(t, (_, res) => json(res, response));
  await assert.rejects(service.run(request), /does not match/);
  response = { ...page(0, 0), has_more: true };
  await assert.rejects(service.events(RUN), /did not advance/);
  response = { ...page(0, 1), runtime_run_id: TOKEN };
  await assert.rejects(service.events(RUN), /unsupported Composer run receipt/);
});


test('missing local authentication keeps actionable setup guidance', async () => {
  const service = new ComposerService({ client: new HttpMantisClient({ requireAuth() { throw new Error('Run mantis setup first (API key + URL).'); } }) });
  await assert.rejects(service.access(), /Run mantis setup first/);
});
