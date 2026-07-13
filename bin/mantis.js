#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';



import { getContainer } from '../lib/container.js';

import { parseUseCommand } from '../lib/utils/tool-args.js';

import { PACKAGE_ROOT } from '../lib/utils/package-root.js';



// single source of truth for the version: package.json (never hardcode)
const { version: VERSION } = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
);

const c = getContainer();

const { map, codebaseIndexer, tools, ui, setup, selection, context, query } = c;

const program = new Command();



function defaultCodebaseOut(root) {

  const base = path.basename(path.resolve(root || process.cwd())) || 'codebase';

  return path.resolve(process.cwd(), `${base}-codebase.csv`);

}



function addMapOptions(cmd) {

  return cmd

    .option('--space-mode <mode>', 'new or existing')

    .option('--space-id <uuid>', 'existing Mantis space id')

    .option('--space-name <name>', 'new space name or display name for existing space')

    .option('--space-search <query>', 'search text for choosing an existing space')

    .option('--public', 'make a new space public')

    .option('--private', 'make a new space private')

    .option('--map-name <name>', 'map name')

    .option('--title-column <columns>', 'comma-separated title column names')

    .option('--semantic-column <columns>', 'comma-separated semantic column names')

    .option('--numeric-column <columns>', 'comma-separated numeric column names')

    .option('--categoric-column <columns>', 'comma-separated categorical column names')

    .option('--date-column <columns>', 'comma-separated date column names')

    .option('--links-column <columns>', 'comma-separated link column names')

    .option('--delete-column <columns>', 'comma-separated ignored column names')

    .option('--data-types <json>', 'raw data_types JSON array')

    .option('--activate', 'set created space/thread as active context')

    .option('--no-activate', 'do not update active space/thread')

    .option('--thread-name <name>', 'thread name when activating');

}



function addListOptions(cmd) {

  return cmd

    .option('--filter <query>', 'search filter')

    .option('--offset <n>', 'pagination offset', (v) => parseInt(v, 10) || 0)

    .option('--limit <n>', 'page size', (v) => parseInt(v, 10) || 4);

}



async function listTools() {

  const data = await tools.listTools();

  console.log(JSON.stringify(data, null, 2));

}



program

  .name('mantis')

  .description('Mantis CLI — spaces, maps, and MCP tools for AI agents')

  .version(VERSION);

// also accept `mantis version` (bare, no dashes)
program

  .command('version')

  .description('Print the CLI version')

  .action(() => console.log(VERSION));



program

  .command('setup [provider]')

  .description('Configure Mantis, or install skills for claude/opencode/codex/cursor/windsurf/copilot/antigravity')

  .option('--project', 'Also sync repo-scoped skills (Codex: ./.agents/skills/)')

  .action(async (provider, opts) => {

    try {

      if (!provider) return setup.run();

      setup.runProvider(provider, { project: !!opts.project });

    } catch (e) {

      ui.die(e.message || String(e));

    }

  });



program

  .command('status')

  .description('Show current Mantis config')

  .action(() => {

    const s = context.status();

    console.log('Mantis — status\n');

    console.log(`Config:  ${s.configPath}`);

    console.log(`API:     ${s.apiBaseUrl}`);

    console.log(`MCP:     ${s.mcpUrl}`);

    console.log(`API key: ${s.apiKeyHint}`);

    console.log(`Space:   ${s.spaceName} (${s.spaceId})`);

    console.log(`Thread:  ${s.threadName} (${s.threadId})`);

    if (!s.hasThread) {

      console.log('\nNo thread selected. Run: mantis select thread');

      process.exit(1);

    }

  });



program

  .command('select')

  .description('Select active space and thread')

  .argument('[target]', 'space, thread, or both', 'both')

  .action(async (target) => {

    if (target === 'space') return selection.pickSpace();

    if (target === 'thread') return selection.pickThread();

    ui.banner('Mantis — switch space / thread');

    await selection.pickSpace();

    await selection.pickThread();

  });



const spaces = program.command('spaces').description('List, resolve, or set spaces');



addListOptions(spaces.command('list').description('List spaces (JSON)')).action(async (opts) => {

  try {

    const data = await query.spacesForPrompt(opts.filter || '', { limit: opts.limit, offset: opts.offset });

    console.log(JSON.stringify(data));

  } catch (e) {

    console.error(JSON.stringify({ error: e.message }));

    process.exit(1);

  }

});



spaces

  .command('resolve')

  .description('Resolve a space link or UUID (JSON)')

  .argument('<query>', 'space link or UUID')

  .action(async (queryText) => {

    try {

      const data = await selection.resolveSpace(queryText);

      console.log(JSON.stringify(data));

    } catch (e) {

      console.error(JSON.stringify({ error: e.message }));

      process.exit(1);

    }

  });



spaces

  .command('set')

  .description('Set active space by UUID')

  .argument('<uuid>', 'space UUID')

  .argument('[name]', 'display name')

  .action((uuid, name) => console.log(JSON.stringify(selection.setSpace(uuid, name || ''))));



const threads = program.command('threads').description('List or set threads in the active space');



addListOptions(threads.command('list').description('List threads (JSON)')).action(async (opts) => {

  try {

    const data = await query.threadsForPrompt(opts.filter || '', { limit: opts.limit, offset: opts.offset });

    console.log(JSON.stringify(data));

  } catch (e) {

    console.error(JSON.stringify({ error: e.message }));

    process.exit(1);

  }

});



threads

  .command('new')

  .description('Create and activate a new thread')

  .argument('[name]', 'thread name')

  .action(async (name) => {

    try {

      const result = await selection.setThread('--new', name);

      console.log(JSON.stringify(result));

    } catch (e) {

      console.error(e.message || String(e));

      process.exit(1);

    }

  });



threads

  .command('set')

  .description('Set active thread by UUID')

  .argument('<uuid>', 'thread UUID')

  .argument('[name]', 'display name')

  .action(async (uuid, name) => {

    try {

      const result = await selection.setThread(uuid, name);

      console.log(JSON.stringify(result));

    } catch (e) {

      console.error(e.message || String(e));

      process.exit(1);

    }

  });



const toolsCmd = program.command('tools').description('MCP tools available via mantis use');

toolsCmd.command('list', { isDefault: true }).description('List tools (JSON)').action(async () => {

  try {

    await listTools();

  } catch (e) {

    console.error(JSON.stringify({ error: e.message }));

    process.exit(1);

  }

});



program

  .command('use <tool>')

  .description('Call a Mantis MCP tool (prints JSON)')

  .allowUnknownOption()

  .allowExcessArguments()

  .action(async () => {

    try {

      const { tool, args } = parseUseCommand(process.argv);

      const result = await tools.useTool(tool, args);

      console.log(JSON.stringify(result, null, 2));

    } catch (e) {

      ui.die(e.message || String(e));

    }

  });



const create = program.command('create').description('Create Mantis resources from local inputs');



addMapOptions(create

  .command('map')

  .description('Create a Mantis map from a local CSV/XLSX file')

  .argument('<file>', 'CSV/XLSX file path'))

  .action(async (file, opts) => {

    try {

      if (opts.private) opts.public = false;

      const result = await map.createMap(path.resolve(file), opts);

      console.log(JSON.stringify(result, null, 2));

    } catch (e) {

      ui.die(e.message || String(e));

    }

  });



addMapOptions(create

  .command('codebase')

  .description('Index a local codebase into CSV, optionally creating a Mantis map')

  .argument('[root]', 'codebase root', '.')

  .option('--out <file>', 'output CSV path')

  .option('--max-chars <n>', 'max characters stored per file', (v) => Number(v), 12000)

  .option('--create-map', 'create a Mantis map after writing the CSV'))

  .action(async (root, opts) => {

    try {

      if (opts.private) opts.public = false;

      const out = path.resolve(opts.out || defaultCodebaseOut(root));

      const result = await codebaseIndexer.index(root, out, { maxChars: opts.maxChars });

      ui.success(`Indexed ${result.count} files`);

      ui.info(`CSV: ${result.outFile}`);

      if (result.skipped?.length) {

        ui.info(`Skipped ${result.skipped.length} binary file(s) (e.g. ${result.skipped.slice(0, 3).join(', ')})`);

      }

      if (opts.createMap) {

        const mapResult = await map.createMap(result.outFile, {

          ...opts,

          mapName: opts.mapName || `${path.basename(path.resolve(root))} Code Index`,

          titleColumn: opts.titleColumn || 'path',

          semanticColumn: opts.semanticColumn || 'summary,content,imports',

          categoricColumn: opts.categoricColumn || 'language,kind,extension',

          numericColumn: opts.numericColumn || 'loc,bytes',

        });

        console.log(JSON.stringify({ csv: result, map: mapResult }, null, 2));

      } else {

        console.log(JSON.stringify(result, null, 2));

      }

    } catch (e) {

      ui.die(e.message || String(e));

    }

  });



program.parseAsync(process.argv);

