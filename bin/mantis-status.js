#!/usr/bin/env node
import { loadConfig, configPath, mcpUrl } from '../lib/config.js';

const cfg = loadConfig();
console.log('Mantis Claude Code — status\n');
console.log(`Config file: ${configPath()}`);
console.log(`API base:    ${cfg.apiBaseUrl || '(not set — use mantis-setup)'}`);
console.log(`MCP URL:     ${cfg.apiBaseUrl ? mcpUrl(cfg) : '(run setup)'}`);
console.log(`API key:     ${cfg.apiKey ? '***' + cfg.apiKey.slice(-6) : '(not set)'}`);
console.log(`Space:       ${cfg.spaceName || '-'} (${cfg.spaceId || '-'})`);
console.log(`Thread:      ${cfg.spaceStateName || '-'} (${cfg.spaceStateId || '-'})`);
if (!cfg.spaceStateId) {
  console.log('\nNo thread selected. Run: mantis-setup');
  process.exit(1);
}
