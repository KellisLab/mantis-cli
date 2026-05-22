#!/usr/bin/env node
import { createSpaceState } from '../lib/api.js';
import { loadConfig, saveConfig } from '../lib/config.js';
import { syncMcpConfigs } from '../lib/mcp-config.js';

const arg = process.argv[2];
const arg2 = process.argv[3];
if (!arg) {
  console.error('Usage: mantis-set-thread <thread-uuid> [name] | mantis-set-thread --new [name]');
  process.exit(1);
}

const cfg = loadConfig();
if (!cfg.apiKey || !cfg.apiBaseUrl || !cfg.spaceId) {
  console.error('Run mantis-setup and pick a space first.');
  process.exit(1);
}

let thread;
if (arg === '--new') {
  const name = arg2 || 'Claude Code';
  thread = await createSpaceState(cfg.apiBaseUrl, cfg.apiKey, cfg.spaceId, name);
} else {
  thread = { id: arg, name: arg2 || arg };
}

const next = {
  ...cfg,
  spaceStateId: thread.id,
  spaceStateName: thread.name,
};
saveConfig(next);
syncMcpConfigs(next);
console.log(JSON.stringify({ ok: true, spaceStateId: thread.id, name: thread.name }));
