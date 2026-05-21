#!/usr/bin/env node
import { fetchOwnedSpaces } from '../lib/fetch.js';
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

  process.stdout.write('  \x1b[2m… fetching spaces\x1b[0m');
  let spaces;
  try {
    spaces = await fetchOwnedSpaces(apiBaseUrl, apiKey);
    process.stdout.write('\r\x1b[K');
  } catch (e) {
    process.stdout.write('\r\x1b[K');
    die(`Could not list spaces: ${e.message}`);
  }
  if (!spaces.length) die('No owned spaces found.');

  success(`${spaces.length} space(s) found`);
  saveConfig({ apiBaseUrl, apiKey });

  await pickSpace();
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
    info(`Claude plugin auto-install skipped: ${e.message}`);
    info('Run: npm install -g mantis-claude-code && mantis-setup');
  }
  console.log('');
}

main().catch((e) => die(e.message || String(e)));
