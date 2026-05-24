#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';

import { createCodebaseCsv } from '../lib/codebase-csv.js';
import { createMapFlow } from '../lib/map-create.js';
import { die, info, success } from '../lib/ui.js';

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
    .option('--activate', 'set created space/thread as active in Claude Code')
    .option('--no-activate', 'do not set active Claude Code context')
    .option('--thread-name <name>', 'thread name when activating');
}

program
  .name('mantis')
  .description('Mantis developer CLI — manage spaces, create maps, and configure Claude Code integration')
  .version('2.0.1');

program
  .command('setup')
  .description('Connect Claude Code to Mantis')
  .action(async () => import('./mantis-setup.js'));

program
  .command('status')
  .description('Show current Mantis Claude Code config')
  .action(async () => import('./mantis-status.js'));

program
  .command('select')
  .description('Select active Mantis space and thread')
  .argument('[target]', 'space, thread, or both', 'both')
  .action(async (target) => {
    if (target === 'space') return import('./mantis-pick-space.js');
    if (target === 'thread') return import('./mantis-pick-thread.js');
    return import('./mantis-select.js');
  });

const create = program.command('create').description('Create Mantis resources from local inputs');

addMapOptions(create
  .command('map')
  .description('Create a Mantis map from a local CSV/XLSX file')
  .argument('<file>', 'CSV/XLSX file path'))
  .action(async (file, opts) => {
    try {
      if (opts.private) opts.public = false;
      const result = await createMapFlow(path.resolve(file), opts);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      die(e.message || String(e));
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
      const result = await createCodebaseCsv(root, out, { maxChars: opts.maxChars });
      success(`Indexed ${result.count} files`);
      info(`CSV: ${result.outFile}`);
      if (result.skipped?.length) {
        info(`Skipped ${result.skipped.length} binary file(s) (e.g. ${result.skipped.slice(0, 3).join(', ')})`);
      }
      if (opts.createMap) {
        const mapResult = await createMapFlow(result.outFile, {
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
      die(e.message || String(e));
    }
  });

program.parseAsync(process.argv);
