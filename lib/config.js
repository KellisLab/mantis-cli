import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_NAME = 'config.json';
export const DEFAULT_API_BASE = 'https://kellis-h200-1.csail.mit.edu';
export const DEVELOPER_PORTAL_URL = 'https://mantis.csail.mit.edu/developer/#keys';

export function canonicalConfigPath() {
  return path.join(os.homedir(), '.mantis', 'claude-code', CONFIG_NAME);
}

function pluginDataConfigPath() {
  if (!process.env.CLAUDE_PLUGIN_DATA) return null;
  return path.join(process.env.CLAUDE_PLUGIN_DATA, CONFIG_NAME);
}

/** Paths that may hold config (canonical first). */
export function allConfigPaths() {
  const paths = [canonicalConfigPath()];
  const plugin = pluginDataConfigPath();
  if (plugin) paths.push(plugin);
  return [...new Set(paths)];
}

export function configPath() {
  return canonicalConfigPath();
}

export function loadConfig() {
  const canonical = canonicalConfigPath();
  if (fs.existsSync(canonical)) {
    try {
      return JSON.parse(fs.readFileSync(canonical, 'utf8'));
    } catch {
      /* fall through */
    }
  }
  const plugin = pluginDataConfigPath();
  if (plugin && fs.existsSync(plugin)) {
    try {
      return JSON.parse(fs.readFileSync(plugin, 'utf8'));
    } catch {
      /* empty */
    }
  }
  return {};
}

export function saveConfig(cfg) {
  const body = JSON.stringify(cfg, null, 2);
  for (const file of allConfigPaths()) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
}

export function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function mcpUrl(cfg) {
  const base = normalizeBaseUrl(cfg.apiBaseUrl || process.env.MANTIS_API_URL || DEFAULT_API_BASE);
  return `${base}/mcp_integrated/`;
}
