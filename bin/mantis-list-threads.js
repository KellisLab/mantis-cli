#!/usr/bin/env node
import { threadsForPrompt } from '../lib/list-cli.js';

const args = process.argv.slice(2);
let filter = '';
let offset = 0;
let limit = 4;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--offset') {
    offset = parseInt(args[++i], 10) || 0;
    continue;
  }
  if (a === '--limit') {
    limit = parseInt(args[++i], 10) || 4;
    continue;
  }
  if (a === '--filter') {
    filter = args[++i] ?? '';
    continue;
  }
  filter = args.slice(i).join(' ').trim();
  break;
}

try {
  const data = await threadsForPrompt(filter, { limit, offset });
  process.stdout.write(JSON.stringify(data));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
