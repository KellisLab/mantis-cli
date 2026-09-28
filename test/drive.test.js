import test from 'node:test';
import assert from 'node:assert/strict';
import { Command } from 'commander';
import { registerDriveCommands } from '../lib/commands/drive.js';
import { DriveError, DriveService } from '../lib/services/drive-service.js';

const CONFIG = { apiBaseUrl: 'https://kellis-h200-1.csail.mit.edu', apiKey: 'test_key', spaceId: 'space-1', spaceStateId: 'thread-1', spaceStateName: 'Main' };
const CLUSTER = 'mantis://map/m1/cluster/c1';

function service({ tool = async () => ({ ok: true }), request = async () => ({}) } = {}) {
  const calls = [];
  const drive = new DriveService({
    configStore: { requireAuth: () => CONFIG },
    client: { request: async (...args) => { calls.push(['request', ...args]); return request(...args); }, listSpaces: async () => ({}) },
    mcp: {
      callTool: async (...args) => { calls.push(['tool', ...args]); return tool(...args); },
      listTools: async () => ({ tools: [{ name: 'inspect' }] }),
    },
  });
  return { drive, calls };
}

function harness(drive) {
  const output = [], errors = [], launched = [];
  const program = new Command().exitOverride();
  registerDriveCommands(program, { drive }, { output: (v) => output.push(v), failure: (e) => errors.push(e), launch: (url) => launched.push(url) });
  return { output, errors, launched, parse: (args) => program.parseAsync(['node', 'mantis', ...args]) };
}

test('open builds the thread link on the frontend host and only opens a browser when asked to', async () => {
  const h = harness(service().drive);
  await h.parse(['open', '--print', '--chat', 'chat-9']);
  assert.equal(h.output[0].url, 'https://mantis.csail.mit.edu/space/space-1?thread=thread-1&chat=chat-9');
  assert.deepEqual(h.launched, []);
  await h.parse(['open']);
  assert.deepEqual(h.launched, ['https://mantis.csail.mit.edu/space/space-1?thread=thread-1']);
});

test('state reads the live thread through the developer API', async () => {
  const { drive, calls } = service({ request: async () => ({ state: { selection: { count: 3 } } }) });
  const h = harness(drive);
  await h.parse(['state', 'selection', 'bags', '--map', 'm1']);
  assert.deepEqual(calls[0], ['request', 'GET', '/api/v1/me/space-states/thread-1/state/', { params: { fields: 'selection,bags', map_id: 'm1' } }]);
  assert.deepEqual(h.output[0], { state: { selection: { count: 3 } } });
});

test('selection, focus, fit and panels map onto the tools and drive commands', async () => {
  const { drive, calls } = service();
  const h = harness(drive);
  await h.parse(['selection', CLUSTER, '--focus', 'mantis://map/m1/point/p1']);
  await h.parse(['selection', '--clear']);
  await h.parse(['focus', CLUSTER, '--tab', 'tab-2']);
  await h.parse(['fit']);
  await h.parse(['panel', 'open', 'plots', '--location', 'right']);
  assert.deepEqual(calls.map(([, name, args]) => [name, args]), [
    ['select', { uris: [CLUSTER], focus_point: 'mantis://map/m1/point/p1' }],
    ['clear_selection', {}],
    ['ui_command', { command: 'view.focus', args: { uri: CLUSTER }, tab_id: 'tab-2' }],
    ['ui_command', { command: 'view.fit', args: {} }],
    ['ui_command', { command: 'panel.open', args: { panel: 'plots', location: 'right' } }],
  ]);
  assert.deepEqual(h.errors, []);
});

test('ui run passes free-form arguments and keeps targeting options out of them', async () => {
  const { drive, calls } = service();
  const original = process.argv;
  process.argv = ['node', 'mantis', 'ui', 'run', 'demo.caption', '--text', 'Selecting the cluster', '--seconds', '3', '--timeout', '5'];
  try { await harness(drive).parse(process.argv.slice(2)); } finally { process.argv = original; }
  assert.deepEqual(calls[0], ['tool', 'ui_command', { command: 'demo.caption', args: { text: 'Selecting the cluster', seconds: 3 }, timeout: 5 }]);
});

test('a refusal carries its code, hint and a meaningful exit code', async () => {
  const { drive } = service({ tool: async () => ({ ok: false, error: { code: 'no_tab_attached', message: 'No tab is open on this thread.', hint: 'Open https://…', retryable: true } }) });
  await assert.rejects(drive.command('view.fit'), (error) => {
    assert.ok(error instanceof DriveError);
    assert.deepEqual([error.code, error.exitCode, error.retryable, error.hint], ['no_tab_attached', 5, true, 'Open https://…']);
    return true;
  });
  const unknown = service({ tool: async () => ({ success: false, error: 'uri_invalid', message: 'Not a Mantis URI' }) });
  await assert.rejects(unknown.drive.select(['nope']), (error) => error.code === 'uri_invalid' && error.exitCode === 7);
});

test('doctor is healthy headlessly and only requires a tab with --ui', async () => {
  const { drive } = service({
    request: async () => ({ name: 'Main', space_state_id: 'thread-1' }),
    tool: async () => ({ ok: true, level: 'standard', commands: { 'view.fit': {} }, tabs: [], open_link: 'https://mantis.csail.mit.edu/space/space-1?thread=thread-1' }),
  });
  const headless = await drive.doctor();
  assert.equal(headless.ok, true);
  assert.deepEqual(headless.checks.map((c) => [c.check, c.ok]), [['key and API', true], ['thread', true], ['tools', true]]);

  const ui = await drive.doctor({ requireUi: true });
  assert.equal(ui.ok, false);
  assert.deepEqual(ui.checks.map((c) => [c.check, c.ok]), [['key and API', true], ['thread', true], ['tools', true], ['tab attached', false]]);
  assert.match(ui.checks[3].hint, /thread=thread-1/);
});
