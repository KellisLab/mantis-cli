import path from 'node:path';

import { createMapInSpace, createSpace, createSpaceState } from './api.js';
import { loadConfig, normalizeBaseUrl, saveConfig } from './config.js';
import { readCsvHeaders } from './csv.js';
import { fieldSummary, inferFieldTypes } from './fields.js';
import { fetchSpaceById, searchSpaces } from './spaces.js';
import { syncMcpConfigs } from './mcp-config.js';
import { info, promptConfirm, promptInput, promptSelect, success } from './ui.js';

function requireAuth() {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) {
    throw new Error('Run mantis setup first (API key + URL).');
  }
  return cfg;
}

function boolOption(value, fallback = false) {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'public'].includes(String(value).toLowerCase());
}

function frontendBaseUrl(apiBaseUrl) {
  const root = normalizeBaseUrl(apiBaseUrl).replace(/\/api\/?$/, '');
  let url;
  try {
    url = new URL(root);
  } catch {
    return root;
  }
  // Local dev: API on :8000, frontend on :3000.
  if (/^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
    url.port = '3000';
    return url.origin;
  }
  // Mantis production: API on kellis-h200-1.csail.mit.edu, frontend on mantis.csail.mit.edu.
  if (/(^|\.)kellis-h200-1\.csail\.mit\.edu$/i.test(url.hostname)) {
    url.hostname = 'mantis.csail.mit.edu';
    return url.origin;
  }
  return root;
}

function spaceUrl(baseUrl, spaceId) {
  return `${frontendBaseUrl(baseUrl)}/space/${spaceId}`;
}

async function chooseExistingSpace(cfg, filter = '') {
  const page = await searchSpaces(cfg.apiBaseUrl, cfg.apiKey, { q: filter, limit: 12 });
  if (!page.spaces?.length) throw new Error('No spaces found.');
  return promptSelect('Which space should receive this map?', page.spaces.map((s) => ({
    name: `${s.name} · ${s.map_count ?? 0} map(s) · ${s.role || 'space'}`,
    value: s,
    description: s.id,
  })));
}

async function resolveSpaceTarget(cfg, opts) {
  let mode = opts.spaceMode;
  if (!mode) {
    mode = await promptSelect('Where should this map go?', [
      { name: 'Create a new space', value: 'new' },
      { name: 'Add to an existing space', value: 'existing' },
    ]);
  }

  if (mode === 'existing') {
    if (opts.spaceId) {
      const space = opts.spaceName ? null : await fetchSpaceById(cfg.apiBaseUrl, cfg.apiKey, opts.spaceId);
      return { spaceId: opts.spaceId, spaceName: opts.spaceName || space?.name };
    }
    const picked = await chooseExistingSpace(cfg, opts.spaceSearch || '');
    return { spaceId: picked.id, spaceName: picked.name };
  }

  const spaceName = opts.spaceName || await promptInput('New space name', {
    default: path.basename(opts.file, path.extname(opts.file)) || 'Claude Code Map',
  });
  const isPublic = opts.public != null ? boolOption(opts.public) : await promptConfirm('Make this space public?', { default: false });
  return { spaceName, isPublic };
}

export async function createMapFlow(file, opts = {}) {
  const cfg = requireAuth();
  const mapName = opts.mapName || await promptInput('Map name', {
    default: path.basename(file, path.extname(file)),
  });
  const headers = readCsvHeaders(file);
  const dataTypes = opts.dataTypes ? JSON.parse(opts.dataTypes) : inferFieldTypes(headers, opts);
  info(`Fields: ${fieldSummary(headers, dataTypes).join(' | ')}`);

  const target = await resolveSpaceTarget(cfg, { ...opts, file });

  let spaceId = target.spaceId;
  let spaceName = target.spaceName;
  if (!spaceId) {
    const space = await createSpace(cfg.apiBaseUrl, cfg.apiKey, {
      name: target.spaceName,
      isPublic: target.isPublic,
    });
    spaceId = space.id;
    spaceName = space.name;
    info(`Created space: ${spaceName} (${spaceId})`);
  }

  const result = await createMapInSpace(cfg.apiBaseUrl, cfg.apiKey, spaceId, {
    file,
    mapName,
    dataTypes,
    selectedFields: opts.selectedFields,
    fieldWeights: opts.fieldWeights,
  });

  const primaryMapId = result.map_id || result.base_map_id || result.map_ids?.[0];
  target.spaceName = spaceName;
  success('Map creation started');
  info(`Space: ${target.spaceName || spaceId} (${spaceId})`);
  info(`Map:   ${mapName}${primaryMapId ? ` (${primaryMapId})` : ''}`);
  if (spaceId) info(`Link:  ${spaceUrl(cfg.apiBaseUrl, spaceId)}`);

  const activate = opts.activate != null ? boolOption(opts.activate) : await promptConfirm('Set this as the active Claude Code Mantis space?', { default: true });
  let thread = null;
  if (activate) {
    const threadName = opts.threadName || await promptInput('Thread name', { default: `${mapName} Exploration` });
    thread = await createSpaceState(cfg.apiBaseUrl, cfg.apiKey, spaceId, threadName);
    const next = {
      ...cfg,
      spaceId,
      spaceName: target.spaceName || mapName,
      spaceStateId: thread.id,
      spaceStateName: thread.name,
    };
    saveConfig(next);
    syncMcpConfigs(next);
    success(`Active thread: ${thread.name}`);
    info('Run /reload-plugins in Claude Code before using Mantis MCP tools.');
  }

  return {
    ...result,
    space_id: spaceId,
    map_id: primaryMapId,
    space_url: spaceId ? spaceUrl(cfg.apiBaseUrl, spaceId) : undefined,
    thread,
  };
}
