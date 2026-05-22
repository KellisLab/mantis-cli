import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mcpUrl } from './config.js';

const MARKETPLACE = 'mantis-plugins';
const PACKAGE = 'mantis-claude-code';

function existingPackageRoot(root) {
  return root && fs.existsSync(path.join(root, 'package.json')) ? path.normalize(root) : null;
}

function isInstallRoot(root) {
  const p = root.toLowerCase();
  return p.includes(`${path.sep}.claude${path.sep}plugins${path.sep}`) ||
    p.endsWith(`${path.sep}node_modules${path.sep}${PACKAGE}`);
}

function cacheRoots() {
  const base = path.join(os.homedir(), '.claude', 'plugins', 'cache', MARKETPLACE, 'mantis');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).map((v) => path.join(base, v));
}

export function pluginRoots() {
  const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const home = os.homedir();
  return [
    here,
    path.join(home, '.claude', 'plugins', 'marketplaces', MARKETPLACE),
    path.join(home, '.claude', 'plugins', 'npm-cache', 'node_modules', PACKAGE),
    path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', PACKAGE),
    ...cacheRoots(),
  ].map(existingPackageRoot).filter(Boolean).filter(isInstallRoot).filter((v, i, a) => a.indexOf(v) === i);
}

export function mcpConfig(cfg) {
  const server = { type: 'http', url: mcpUrl(cfg) };
  if (cfg.spaceStateId) server.headers = { 'X-Space-State-ID': String(cfg.spaceStateId) };
  return { mcpServers: { mantis: server } };
}

export function syncMcpConfigs(cfg) {
  const body = `${JSON.stringify(mcpConfig(cfg), null, 2)}\n`;
  for (const root of pluginRoots()) {
    fs.writeFileSync(path.join(root, '.mcp.json'), body);
  }
}
