#!/usr/bin/env node
import { loadConfig } from '../lib/config.js';
import { resolveSpaceFromInput } from '../lib/spaces.js';

const input = process.argv.slice(2).join(' ').trim();
if (!input) {
  console.error(JSON.stringify({ error: 'Provide a space link or UUID' }));
  process.exit(1);
}

try {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) {
    throw new Error('Run mantis-setup first (API key + URL).');
  }
  const space = await resolveSpaceFromInput(cfg.apiBaseUrl, cfg.apiKey, input);
  if (!space) {
    console.error(JSON.stringify({ error: 'Space not found or no access' }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ space, threadCleared: true }));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
