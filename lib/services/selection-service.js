import { BROWSE_PAGE, DEFAULT_THREAD_NAME } from '../constants.js';
import { parseSpaceIdFromInput } from '../utils/space-id.js';
import { defaultThreadName, findThreadByName } from '../utils/threads.js';

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

export class SelectionService {
  constructor({ configStore, spaces, client, ui }) {
    this.configStore = configStore;
    this.spaces = spaces;
    this.client = client;
    this.ui = ui;
  }

  _saveSpace(cfg, space) {
    const changed = cfg.spaceId !== space.id;
    const next = { ...cfg, spaceId: space.id, spaceName: space.name };
    if (changed) {
      delete next.spaceStateId;
      delete next.spaceStateName;
    }
    this.configStore.save(next);
    this.ui.success(`Space: ${space.name}`);
    if (changed) this.ui.info('Thread cleared — run: mantis select thread');
    return next;
  }

  _saveThread(cfg, thread) {
    const next = { ...cfg, spaceStateId: thread.id, spaceStateName: thread.name };
    this.configStore.save(next);
    this.ui.success(`Thread: ${thread.name}`);
    return next;
  }

  _threadChoices(threads, query) {
    const terms = (query || '').trim().toLowerCase();
    const list = terms
      ? threads.filter((t) => `${t.name} ${t.id}`.toLowerCase().includes(terms))
      : threads;
    const out = [{ name: '➕ Create new thread', value: '__new__', description: 'New space state' }];
    for (const t of list) {
      const when = t.updated_at ? String(t.updated_at).slice(0, 10) : '';
      out.push({ name: t.name || '(unnamed)', value: t, description: when || t.id });
    }
    return out;
  }

  async _pickSpaceByLink(cfg) {
    const raw = await this.ui.promptInput('Paste Mantis space link or UUID (Enter to browse)', { default: '' });
    if (!raw?.trim()) return null;
    const space = await this.spaces.resolveFromInput(raw);
    if (!space) this.ui.die('Space not found or you do not have access.');
    return this._saveSpace(cfg, space);
  }

  async pickSpace(initialFilter = '') {
    const cfg = this.configStore.requireAuth();

    if (!process.stdin.isTTY) {
      const page = await this.spaces.search({ q: initialFilter, limit: 1 });
      if (!page.spaces?.length) this.ui.die('No spaces found.');
      return this._saveSpace(cfg, page.spaces[0]);
    }

    const fromLink = await this._pickSpaceByLink(cfg);
    if (fromLink) return fromLink;

    const picked = await this.ui.promptSearch(
      'Select space (↑↓ type to search, paste link in previous step)',
      async (input) => {
        const id = parseSpaceIdFromInput(input);
        if (id) {
          const one = await this.spaces.resolveFromInput(input);
          return one ? spaceChoices([one]) : [{ name: 'No match for that link/id', value: null, disabled: true }];
        }
        const page = await this.spaces.search({
          q: input || initialFilter || '',
          limit: BROWSE_PAGE,
          offset: 0,
        });
        return spaceChoices(page.spaces || []);
      },
    );
    if (!picked) this.ui.die('No space selected.');
    return this._saveSpace(cfg, picked);
  }

  async pickThread(initialFilter = '') {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceId) this.ui.die('Pick a space first: mantis select space');

    const threads = await this.spaces.fetchThreads(cfg.spaceId);

    if (!process.stdin.isTTY) {
      if (!threads.length) this.ui.die('No threads. Run interactively to create one.');
      return this._saveThread(cfg, threads[0]);
    }

    const picked = await this.ui.promptSearch(
      `Thread in "${cfg.spaceName || 'space'}" (↑↓, type to filter)`,
      async (input) => this._threadChoices(threads, input || initialFilter),
    );

    if (picked === '__new__') {
      const defaultName = defaultThreadName(DEFAULT_THREAD_NAME, threads);
      const name = await this.ui.promptInput('Thread name', { default: defaultName });
      return this._createThread(cfg, threads, name || defaultName);
    }
    return this._saveThread(cfg, picked);
  }

  async _createThread(cfg, threads, name) {
    const trimmed = String(name || DEFAULT_THREAD_NAME).trim() || DEFAULT_THREAD_NAME;
    const existing = findThreadByName(threads, trimmed);
    if (existing) {
      this.ui.info(`Thread "${trimmed}" already exists — using it.`);
      return this._saveThread(cfg, existing);
    }
    const created = await this.client.createSpaceState(cfg.spaceId, trimmed);
    return this._saveThread(cfg, created);
  }

  setSpace(id, name = '') {
    const cfg = this.configStore.load();
    const changed = cfg.spaceId !== id;
    const next = {
      ...cfg,
      spaceId: id,
      spaceName: name || cfg.spaceName,
      ...(changed ? { spaceStateId: undefined, spaceStateName: undefined } : {}),
    };
    this.configStore.save(next);
    return { ok: true, spaceId: id, spaceName: name, threadCleared: changed, needThread: changed };
  }

  async setThread(arg, arg2) {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceId) throw new Error('Run mantis setup and pick a space first.');

    let thread;
    if (arg === '--new') {
      const threads = await this.spaces.fetchThreads(cfg.spaceId);
      const name = arg2 || defaultThreadName(DEFAULT_THREAD_NAME, threads);
      const existing = findThreadByName(threads, name);
      thread = existing || await this.client.createSpaceState(cfg.spaceId, name);
    } else {
      thread = { id: arg, name: arg2 || arg };
    }

    const next = { ...cfg, spaceStateId: thread.id, spaceStateName: thread.name };
    this.configStore.save(next);
    return { ok: true, spaceStateId: thread.id, name: thread.name };
  }

  async resolveSpace(input) {
    this.configStore.requireAuth();
    const space = await this.spaces.resolveFromInput(input);
    if (!space) throw new Error('Space not found or no access');
    return { space, threadCleared: true };
  }
}
