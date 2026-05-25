import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CONFIG_NAME } from '../constants.js';
import { normalizeBaseUrl, mcpUrl } from '../utils/url.js';

export { normalizeBaseUrl, mcpUrl };

export class FileConfigStore {
  configPath() {
    return path.join(os.homedir(), '.mantis', CONFIG_NAME);
  }

  load() {
    const file = this.configPath();
    if (!fs.existsSync(file)) return {};
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return {};
    }
  }

  save(cfg) {
    const file = this.configPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
  }

  requireAuth() {
    const cfg = this.load();
    if (!cfg.apiKey || !cfg.apiBaseUrl) {
      throw new Error('Run mantis setup first (API key + URL).');
    }
    return cfg;
  }
}
