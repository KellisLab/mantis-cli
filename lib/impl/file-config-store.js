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
      const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cfg.approvalToken) {
        const expiresAt = Date.parse(cfg.approvalExpiresAt || '');
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          delete cfg.approvalToken;
          delete cfg.approvalExpiresAt;
          this.save(cfg);
        }
      }
      return cfg;
    } catch {
      return {};
    }
  }

  save(cfg) {
    const file = this.configPath();
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temp, `${JSON.stringify(cfg, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      if (process.platform !== 'win32') fs.chmodSync(temp, 0o600);
      fs.renameSync(temp, file);
      if (process.platform !== 'win32') {
        fs.chmodSync(dir, 0o700);
        fs.chmodSync(file, 0o600);
      }
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }

  requireAuth() {
    const cfg = this.load();
    if (!cfg.apiKey || !cfg.apiBaseUrl) {
      throw new Error('Run mantis setup first (API key + URL).');
    }
    return cfg;
  }
}
