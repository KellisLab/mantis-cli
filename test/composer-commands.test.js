import test from 'node:test';
import assert from 'node:assert/strict';
import { Command } from 'commander';
import { registerComposerCommands } from '../lib/commands/composer.js';

function harness(composer) {
  const output = [], errors = [];
  const program = new Command().exitOverride();
  registerComposerCommands(program, { composer }, { output: (value) => output.push(value), failure: (error) => errors.push(error) });
  return { program, output, errors, parse: (args) => program.parseAsync(['node', 'mantis', 'composer', ...args]) };
}

test('run command forwards explicit stable context and model options', async () => {
  let options;
  const h = harness({ run: async (value) => { options = value; return { accepted: true }; } });
  await h.parse(['run', '--chat-id', 'chat', '--snapshot-id', 'snapshot', '--message-id', 'message', '--model-id', 'model', '--message', 'Keep $() literal', '--effort', 'max']);
  assert.equal(options.message, 'Keep $() literal');
  assert.equal(options.messageId, 'message');
  assert.equal(options.effort, 'max');
  assert.deepEqual(h.output, [{ accepted: true }]);
  assert.deepEqual(h.errors, []);
});

test('message/file ambiguity fails without dispatch', async () => {
  const h = harness({ run: async () => assert.fail('Do not dispatch ambiguous input') });
  await h.parse(['run', '--chat-id', 'chat', '--snapshot-id', 'snapshot', '--message-id', 'message', '--model-id', 'model', '--message', 'text', '--file', 'another.txt']);
  assert.match(h.errors[0].message, /exactly one/);
});

test('resume emits actual bounded pages as JSON-line values', async () => {
  const h = harness({ async *resume(run, options) {
    assert.equal(run, 'run'); assert.equal(options.after, '4'); assert.equal(options.pages, '2');
    yield { next_after_sequence: 5, has_more: true }; yield { next_after_sequence: 6, has_more: false };
  } });
  await h.parse(['resume', 'run', '--after', '4', '--pages', '2']);
  assert.deepEqual(h.output.map((page) => page.next_after_sequence), [5, 6]);
});
