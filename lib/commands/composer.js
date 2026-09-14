import { readFile } from 'node:fs/promises';

export function registerComposerCommands(program, { composer }, {
  output = (value) => console.log(JSON.stringify(value)),
  failure = (error) => {
    console.error(JSON.stringify({ error: error.message, ...(error.code ? { code: error.code } : {}),
      ...(error.status ? { status: error.status } : {}) }));
    process.exitCode = 1;
  },
} = {}) {
  const group = program.command('composer').description('Authenticated Composer runs and retained event replay');
  const action = (operation) => async (...args) => {
    try { output(await operation(...args)); } catch (error) { failure(error); }
  };
  group.command('access').description('Check server-enforced pilot access').action(action(() => composer.access()));
  group.command('capabilities').description('Inspect current model and reasoning options').action(action(() => composer.capabilities()));
  group.command('run').description('Submit a saved chat and prepared snapshot; retries require the same message-id')
    .requiredOption('--chat-id <uuid>', 'existing saved chat ID')
    .requiredOption('--snapshot-id <uuid>', 'existing prepared context snapshot ID')
    .requiredOption('--message-id <id>', 'stable request identity; reuse after an uncertain response')
    .requiredOption('--model-id <id>', 'exact model ID returned by composer capabilities')
    .option('--message <text>', 'analysis request text')
    .option('--file <path>', 'read analysis request text from a UTF-8 file')
    .option('--effort <level>', 'low, high, or max; omitted uses the server default')
    .action(action(async (options) => {
      if (Boolean(options.message !== undefined) === Boolean(options.file !== undefined)) throw new Error('Provide exactly one of --message or --file.');
      const message = options.file !== undefined ? await readFile(options.file, 'utf8') : options.message;
      return composer.run({ ...options, message });
    }));
  group.command('status <run-id>').description('Inspect actual run and cancellation state')
    .action(action((runId) => composer.status(runId)));
  group.command('events <run-id>').description('Read one ordered event page, including retention gaps')
    .option('--after <sequence>', 'last observed delivery sequence', '0')
    .option('--limit <count>', 'page size, 1–200', '100')
    .action(action((runId, options) => composer.events(runId, options)));
  group.command('resume <run-id>').description('Resume reading retained events without submitting another analysis')
    .option('--after <sequence>', 'last observed delivery sequence', '0')
    .option('--limit <count>', 'page size, 1–200', '100')
    .option('--pages <count>', 'maximum pages, 1–100; emits JSON lines', '10')
    .action(async (runId, options) => {
      try { for await (const page of composer.resume(runId, options)) output(page); }
      catch (error) { failure(error); }
    });
  group.command('cancel <run-id>').description('Request Stop; pending does not mean the process stopped')
    .requiredOption('--request-token <uuid>', 'stable cancellation token; reuse when retrying')
    .action(action((runId, options) => composer.cancel(runId, options)));
  return group;
}
