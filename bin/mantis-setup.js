#!/usr/bin/env node
import { DEFAULT_API_BASE, loadConfig, normalizeBaseUrl, saveConfig } from '../lib/config.js';
import { pickSpace, pickThread } from '../lib/picker.js';
import { installClaudePlugin } from '../lib/claude-plugin.js';
import { banner, die, info, promptInput, promptSecret, success } from '../lib/ui.js';

async function main() {
  const prev = loadConfig();
  banner('Mantis ↔ Claude Code', 'Developer API key from the Mantis portal (linked to your user)');

  const apiBaseUrl = normalizeBaseUrl(
    await promptInput('Mantis API URL', {
      default: prev.apiBaseUrl || process.env.MANTIS_API_URL || DEFAULT_API_BASE,
    }),
  );
  const apiKey = (await promptSecret('API key', { default: prev.apiKey }))?.trim();
  if (!apiKey) die('API key is required.');

  saveConfig({ apiBaseUrl, apiKey });

  const afterSpace = await pickSpace();
  const final = await pickThread();
  saveConfig({ ...final, apiBaseUrl, apiKey });

  console.log('');
  success('Setup complete');
  info(`Space:  ${final.spaceName} (${final.spaceId})`);
  info(`Thread: ${final.spaceStateName} (${final.spaceStateId})`);
  info(`MCP:    ${apiBaseUrl}/mcp_integrated/`);
  try {
    const cc = installClaudePlugin();
    if (cc.method === 'cli') {
      success('Claude Code plugin installed (mantis@mantis-plugins)');
      info('Run /reload-plugins in Claude Code if it is already open');
    } else {
      success('Claude Code settings updated');
      info(cc.hint);
    }
  } catch (e) {
    info(`Claude plugin install failed: ${e.message}`);
    info('Fix: claude plugin install mantis@mantis-plugins');
    info('Then in Claude Code: Enable plugin → /reload-plugins');
  }
  console.log('');
}

main().catch((e) => die(e.message || String(e)));
