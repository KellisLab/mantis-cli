#!/usr/bin/env node
import { loadConfig, saveConfig } from '../lib/config.js';
import { syncMcpConfigs } from '../lib/mcp-config.js';

const id = process.argv[2];
const name = process.argv[3] || '';
if (!id) {
  console.error('Usage: mantis-set-space <space-uuid> [name]');
  process.exit(1);
}

const cfg = loadConfig();
const changed = cfg.spaceId !== id;
const next = {
  ...cfg,
  spaceId: id,
  spaceName: name || cfg.spaceName,
  ...(changed ? { spaceStateId: undefined, spaceStateName: undefined } : {}),
};
saveConfig(next);
syncMcpConfigs(next);
console.log(
  JSON.stringify({
    ok: true,
    spaceId: id,
    spaceName: name,
    threadCleared: changed,
    needThread: changed,
    needReloadPlugins: true,
  }),
);
