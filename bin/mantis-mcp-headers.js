#!/usr/bin/env node
import { loadConfig } from '../lib/config.js';

const cfg = loadConfig();
const headers = {};
if (cfg.spaceStateId) {
  headers['X-Space-State-ID'] = String(cfg.spaceStateId);
}
process.stdout.write(JSON.stringify(headers));
