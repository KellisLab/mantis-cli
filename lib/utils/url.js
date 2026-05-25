import { DEFAULT_API_BASE } from '../constants.js';

export function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function mcpUrl(cfg) {
  const base = normalizeBaseUrl(cfg.apiBaseUrl || process.env.MANTIS_API_URL || DEFAULT_API_BASE);
  return `${base}/mcp_integrated/`;
}

export function frontendBaseUrl(apiBaseUrl) {
  const root = normalizeBaseUrl(apiBaseUrl).replace(/\/api\/?$/, '');
  let url;
  try {
    url = new URL(root);
  } catch {
    return root;
  }
  if (/^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
    url.port = '3000';
    return url.origin;
  }
  if (/(^|\.)kellis-h200-1\.csail\.mit\.edu$/i.test(url.hostname)) {
    url.hostname = 'mantis.csail.mit.edu';
    return url.origin;
  }
  return root;
}

export function spaceUrl(apiBaseUrl, spaceId) {
  return `${frontendBaseUrl(apiBaseUrl)}/space/${spaceId}`;
}
