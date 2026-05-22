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

function installedPluginsPath() {
  return path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
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

export function isPluginInstalled() {
  try {
    const data = JSON.parse(fs.readFileSync(installedPluginsPath(), 'utf8'));
    const entries = data.plugins?.[PLUGIN_ID];
    if (!Array.isArray(entries) || !entries.length) return false;
    const installPath = entries[0]?.installPath;
    if (!installPath || !fs.existsSync(installPath)) return false;
    return !fs.existsSync(path.join(installPath, '.orphaned_at'));
  } catch {
    return false;
  }
}

function mergeMarketplaceIntoSettings() {
  const settings = readSettings();
  stripBrokenInlinePlugins(settings);
  settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
  settings.extraKnownMarketplaces[MARKETPLACE] = {
    source: { source: 'github', repo: MARKETPLACE_REPO },
  };
  writeSettings(settings);
}

const BENIGN = [
  /already enabled/i,
  /already installed/i,
  /already on disk/i,
  /no updates/i,
  /is already enabled/i,
];

function runClaude(argv, { optional = false } = {}) {
  const r = spawnSync('claude', argv, {
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  if (r.error) {
    const msg =
      r.error.code === 'ENOENT'
        ? 'claude not found on PATH — install Claude Code CLI first'
        : r.error.message;
    if (optional) return null;
    throw new Error(msg);
  }
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status === 0 || BENIGN.some((re) => re.test(out))) return out;
  if (optional) return null;
  throw new Error(out || `claude ${argv.join(' ')} failed (exit ${r.status})`);
}

function installPluginScopes() {
  for (const scope of ['user', 'local']) {
    if (isPluginInstalled()) return scope;
    runClaude(['plugin', 'install', PLUGIN_ID, '--scope', scope], { optional: true });
  }
  return isPluginInstalled() ? 'user' : null;
}

export function installClaudePlugin() {
  const pluginRoot = resolvePluginRoot();
  mergeMarketplaceIntoSettings();

  runClaude(['plugin', 'marketplace', 'add', MARKETPLACE_REPO, '--scope', 'user'], { optional: true });
  const scope = installPluginScopes();
  if (!scope) {
    throw new Error(
      'Plugin not registered after install. Run: claude plugin install mantis@mantis-plugins',
    );
  }
  runClaude(['plugin', 'update', PLUGIN_ID, '--scope', scope], { optional: true });
  runClaude(['plugin', 'enable', PLUGIN_ID, '--scope', scope], { optional: true });
  const settings = readSettings();
  settings.enabledPlugins = settings.enabledPlugins || {};
  settings.enabledPlugins[PLUGIN_ID] = true;
  writeSettings(settings);
  return { ok: true, method: 'cli', pluginRoot, scope };
}
