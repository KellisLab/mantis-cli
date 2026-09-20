/** Drive a live Mantis tab: bind a tab to the active thread, act on it, and read it back. */
import { frontendBaseUrl } from '../utils/url.js';

const EXIT = { auth: 3, not_found: 4, no_tab: 5, timeout: 6, rejected: 7 };
const EXIT_BY_CODE = {
  no_tab_attached: EXIT.no_tab, command_timeout: EXIT.timeout, thread_not_found: EXIT.not_found,
  scope_missing: EXIT.auth, command_forbidden: EXIT.auth,
};

export class DriveError extends Error {
  constructor(error) {
    super(error?.message || 'The command was refused.');
    this.code = error?.code || 'command_failed';
    this.hint = error?.hint;
    this.retryable = Boolean(error?.retryable);
    this.exitCode = EXIT_BY_CODE[this.code] ?? EXIT.rejected;
  }
}

export class DriveService {
  constructor({ configStore, client, mcp }) {
    this.configStore = configStore;
    this.client = client;
    this.mcp = mcp;
  }

  _thread() {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceId || !cfg.spaceStateId) throw new Error('No space and thread selected. Run: mantis select');
    return cfg;
  }

  /** The link that opens a tab on the CLI's own thread (and, optionally, one Composer chat). */
  openLink({ thread, chat } = {}) {
    const cfg = this._thread();
    const url = new URL(`/space/${cfg.spaceId}`, `${frontendBaseUrl(cfg.apiBaseUrl)}/`);
    url.searchParams.set('thread', thread || cfg.spaceStateId);
    if (chat) url.searchParams.set('chat', chat);
    return { url: url.toString(), space_id: cfg.spaceId, thread_id: thread || cfg.spaceStateId, thread_name: cfg.spaceStateName || null };
  }

  /** Live thread state: what every tab on this thread shows right now. */
  state({ fields, map } = {}) {
    const cfg = this._thread();
    return this.client.request('GET', `/api/v1/me/space-states/${encodeURIComponent(cfg.spaceStateId)}/state/`, {
      params: { fields: Array.isArray(fields) ? fields.join(',') : fields, map_id: map },
    });
  }

  async _tool(name, args) {
    const result = await this.mcp.callTool(name, args);
    if (result && result.ok === false) throw new DriveError(result.error);
    if (result && result.success === false) throw new DriveError({ code: result.error, message: result.message || result.error });
    return result;
  }

  select(uris, { focus } = {}) {
    if (!uris?.length) throw new Error('Name at least one mantis:// URI, or use --clear.');
    return this._tool('select', { uris, ...(focus ? { focus_point: focus } : {}) });
  }

  clearSelection(map) { return this._tool('clear_selection', map ? { map_id: map } : {}); }

  status({ log } = {}) { return this._tool('ui_status', log ? { log_limit: Number(log) } : {}); }

  command(command, args = {}, { map, tab, timeout } = {}) {
    return this._tool('ui_command', {
      command, args,
      ...(map ? { map_id: map } : {}), ...(tab ? { tab_id: tab } : {}), ...(timeout ? { timeout: Number(timeout) } : {}),
    });
  }

  /** key → API → thread → tab attached; the first failing check is named. */
  async doctor() {
    const checks = [];
    const step = async (name, run) => {
      try {
        checks.push({ check: name, ok: true, ...(await run()) });
        return true;
      } catch (error) {
        checks.push({ check: name, ok: false, error: error.message, ...(error.hint ? { hint: error.hint } : {}) });
        return false;
      }
    };
    let status;
    const ok = await step('key and API', async () => {
      const cfg = this.configStore.requireAuth();
      await this.client.listSpaces({ limit: 1 });
      return { api: cfg.apiBaseUrl };
    }) && await step('thread', async () => {
      const state = await this.state({ fields: ['selection'] });
      return { thread: state.name, thread_id: state.space_state_id };
    }) && await step('tools', async () => {
      status = await this.status();
      return { level: status.level, commands: Object.keys(status.commands).length };
    }) && await step('tab attached', async () => {
      if (!status.tabs.length) {
        const error = new Error('No tab is open on this thread.');
        error.hint = `Open ${status.open_link}`;
        throw error;
      }
      return { tabs: status.tabs.length };
    });
    return { ok, checks, ...(status ? { open_link: status.open_link } : {}) };
  }
}
