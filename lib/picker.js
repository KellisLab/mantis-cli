import { createSpaceState, fetchOwnedSpaces, fetchThreads } from './fetch.js';
import { loadConfig, saveConfig } from './config.js';
import { filterItems } from './list-cli.js';
import { die, info, promptInput, promptSearch, success } from './ui.js';

function spaceLabel(s) {
  const name = s.name || '(unnamed)';
  const maps = s.map_count != null ? ` · ${s.map_count} map(s)` : '';
  return name + maps;
}

export async function requireConfig() {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) {
    die('Run mantis-setup or /mantis:connect first (API key + URL).');
  }
  return cfg;
}

function spaceChoices(spaces, query) {
  const list = filterItems(spaces, query, ['name', 'id']);
  return list.map((s) => ({
    name: spaceLabel(s),
    value: s,
    description: s.id,
  }));
}

function threadChoices(threads, query) {
  const list = filterItems(threads, query, ['name', 'id']);
  const out = [
    { name: '➕ Create new thread', value: '__new__', description: 'New space state' },
  ];
  for (const t of list) {
    const when = t.updated_at ? String(t.updated_at).slice(0, 10) : '';
    out.push({
      name: t.name || '(unnamed)',
      value: t,
      description: when || t.id,
    });
  }
  return out;
}

export async function pickSpace(initialFilter = '') {
  const cfg = await requireConfig();
  const spaces = await fetchOwnedSpaces(cfg.apiBaseUrl, cfg.apiKey);
  if (!spaces.length) die('No owned spaces found.');

  if (!process.stdin.isTTY) {
    return saveSpace(cfg, spaces[0]);
  }

  const picked = await promptSearch(
    'Select space (↑↓ move, type to filter)',
    async (input) => spaceChoices(spaces, input || initialFilter),
  );
  return saveSpace(cfg, picked);
}

function saveSpace(cfg, space) {
  const changed = cfg.spaceId !== space.id;
  const next = {
    ...cfg,
    spaceId: space.id,
    spaceName: space.name,
    ...(changed ? { spaceStateId: undefined, spaceStateName: undefined } : {}),
  };
  saveConfig(next);
  success(`Space: ${space.name}`);
  if (changed && cfg.spaceStateId) {
    info('Thread cleared — run /mantis:thread next.');
  }
  return next;
}

export async function pickThread(initialFilter = '') {
  const cfg = await requireConfig();
  if (!cfg.spaceId) die('Pick a space first: /mantis:space');

  const threads = await fetchThreads(cfg.apiBaseUrl, cfg.apiKey, cfg.spaceId);

  if (!process.stdin.isTTY) {
    if (!threads.length) die('No threads. Run interactively to create one.');
    return saveThread(cfg, threads[0]);
  }

  const picked = await promptSearch(
    `Thread in "${cfg.spaceName || 'space'}" (↑↓, type to filter)`,
    async (input) => threadChoices(threads, input || initialFilter),
  );

  if (picked === '__new__') {
    const name = await promptInput('Thread name', { default: 'Claude Code' });
    const created = await createSpaceState(
      cfg.apiBaseUrl, cfg.apiKey, cfg.spaceId, name || 'Claude Code',
    );
    return saveThread(cfg, created);
  }
  return saveThread(cfg, picked);
}

function saveThread(cfg, thread) {
  const next = {
    ...cfg,
    spaceStateId: thread.id,
    spaceStateName: thread.name,
  };
  saveConfig(next);
  success(`Thread: ${thread.name}`);
  info('MCP headers update on reconnect — run /reload-plugins if tools lack context.');
  return next;
}
