import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_NAME = 'config.json';
export const DEFAULT_API_BASE = 'https://kellis-h200-1.csail.mit.edu';
export const DEVELOPER_PORTAL_URL = 'https://mantis.csail.mit.edu/developer';

/** Same file whether set from Bash (no plugin env) or headersHelper (plugin env). */
export function allConfigPaths() {
  const paths = [path.join(os.homedir(), '.mantis', 'claude-code', CONFIG_NAME)];
  if (process.env.CLAUDE_PLUGIN_DATA) {
    paths.push(path.join(process.env.CLAUDE_PLUGIN_DATA, CONFIG_NAME));
  }
  return [...new Set(paths)];
}

export function configPath() {
  return allConfigPaths()[0];
}

export function loadConfig() {
  let best = {};
  let bestMtime = 0;
  for (const file of allConfigPaths()) {
    if (!fs.existsSync(file)) continue;
    try {
      const mtime = fs.statSync(file).mtimeMs;
      if (mtime >= bestMtime) {
        best = JSON.parse(fs.readFileSync(file, 'utf8'));
        bestMtime = mtime;
      }
    } catch {
      /* skip corrupt file */
    }
  }
  return best;
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
