import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKETPLACE = 'mantis-plugins';
const PLUGIN_ID = `mantis@${MARKETPLACE}`;
const MARKETPLACE_REPO = 'KellisLab/mantis-claude-code';

export function resolvePluginRoot() {
  try {
    const root = execSync('npm root -g', { encoding: 'utf8', windowsHide: true }).trim();
    const globalPkg = path.join(root, 'mantis-claude-code');
    if (fs.existsSync(path.join(globalPkg, '.claude-plugin', 'plugin.json'))) {
      return path.normalize(globalPkg);
    }
  } catch {
    /* not installed globally */
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.normalize(path.resolve(here, '..'));
}

function settingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function readSettings() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function stripBrokenInlinePlugins(settings) {
  const bad = (v) =>
    typeof v === 'string' &&
    (v.includes('$(npm') || v.includes('mantis-claude-code-plugin'));
  if (Array.isArray(settings.plugins)) {
    settings.plugins = settings.plugins.filter((p) => {
      const paths = [p?.path, p?.commands, p?.source?.path].filter(Boolean);
      return !paths.some(bad);
    });
    if (!settings.plugins.length) delete settings.plugins;
  }
}

function mergeMarketplaceIntoSettings() {
  const settings = readSettings();
  stripBrokenInlinePlugins(settings);
  settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
  settings.extraKnownMarketplaces[MARKETPLACE] = {
    source: { source: 'github', repo: MARKETPLACE_REPO },
  };
  settings.enabledPlugins = settings.enabledPlugins || {};
  settings.enabledPlugins[PLUGIN_ID] = true;
  writeSettings(settings);
}

function runClaude(argv) {
  const r = spawnSync('claude', argv, { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'claude command failed').trim());
  }
}

export function installClaudePlugin() {
  const pluginRoot = resolvePluginRoot();
  mergeMarketplaceIntoSettings();

  try {
    runClaude(['plugin', 'marketplace', 'add', MARKETPLACE_REPO, '--scope', 'user']);
    try {
      runClaude(['plugin', 'install', PLUGIN_ID, '--scope', 'user']);
    } catch {
      runClaude(['plugin', 'update', PLUGIN_ID, '--scope', 'user']);
    }
    runClaude(['plugin', 'enable', PLUGIN_ID, '--scope', 'user']);
    return { ok: true, method: 'cli', pluginRoot };
  } catch {
    return {
      ok: true,
      method: 'settings',
      pluginRoot,
      hint: 'Restart Claude Code, run /plugin marketplace update mantis-plugins, then /reload-plugins',
    };
  }
}
