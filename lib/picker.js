import { createSpaceState, fetchThreads } from './fetch.js';
import { loadConfig, saveConfig } from './config.js';
import { searchSpaces, resolveSpaceFromInput } from './spaces.js';
import { parseSpaceIdFromInput } from './space-id.js';
import { die, info, promptInput, promptSearch, success } from './ui.js';

const BROWSE_PAGE = 20;

function spaceLabel(s) {
  const name = s.name || '(unnamed)';
  const maps = s.map_count != null ? ` · ${s.map_count} map(s)` : '';
  const role = s.role ? ` · ${s.role}` : '';
  return name + maps + role;
}

function spaceChoices(spaces) {
  return spaces.map((s) => ({
    name: spaceLabel(s),
    value: s,
    description: s.id,
  }));
}

export async function requireConfig() {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.apiBaseUrl) {
    die('Run mantis-setup or /mantis:connect first (API key + URL).');
  }
  return cfg;
}

function threadChoices(threads, query) {
  const terms = (query || '').trim().toLowerCase();
  const list = terms
    ? threads.filter((t) => {
        const hay = `${t.name} ${t.id}`.toLowerCase();
        return hay.includes(terms);
      })
    : threads;
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

async function pickSpaceByLink(cfg) {
  const raw = await promptInput('Paste Mantis space link or UUID (Enter to browse)', {
    default: '',
  });
  if (!raw?.trim()) return null;
  const space = await resolveSpaceFromInput(cfg.apiBaseUrl, cfg.apiKey, raw);
  if (!space) die('Space not found or you do not have access.');
  return saveSpace(cfg, space);
}

export async function pickSpace() {
  const cfg = await requireConfig();

  if (!process.stdin.isTTY) {
    const page = await searchSpaces(cfg.apiBaseUrl, cfg.apiKey, { limit: 1 });
    if (!page.spaces?.length) die('No spaces found.');
    return saveSpace(cfg, page.spaces[0]);
  }

  const fromLink = await pickSpaceByLink(cfg);
  if (fromLink) return fromLink;

  const picked = await promptSearch(
    'Select space (↑↓ type to search, paste link in previous step)',
    async (input) => {
      const id = parseSpaceIdFromInput(input);
      if (id) {
        const one = await resolveSpaceFromInput(cfg.apiBaseUrl, cfg.apiKey, input);
        return one ? spaceChoices([one]) : [{ name: 'No match for that link/id', value: null, disabled: true }];
      }
      const page = await searchSpaces(cfg.apiBaseUrl, cfg.apiKey, {
        q: input || '',
        limit: BROWSE_PAGE,
        offset: 0,
      });
      return spaceChoices(page.spaces || []);
    },
  );
  if (!picked) die('No space selected.');
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
