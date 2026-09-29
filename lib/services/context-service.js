import { mcpUrl } from '../utils/url.js';

export class ContextService {
  constructor({ configStore, client, ui }) {
    this.configStore = configStore;
    this.client = client;
    this.ui = ui;
  }

  async status() {
    const cfg = this.configStore.load();
    const local = {
      configPath: this.configStore.configPath(),
      apiBaseUrl: cfg.apiBaseUrl || '(not set — use mantis setup)',
      mcpUrl: cfg.apiBaseUrl ? mcpUrl(cfg) : '(run setup)',
      apiKeyHint: cfg.apiKey ? `***${cfg.apiKey.slice(-6)}` : '(not set)',
      spaceName: cfg.spaceName || '-',
      spaceId: cfg.spaceId || '-',
      threadName: cfg.spaceStateName || '-',
      threadId: cfg.spaceStateId || '-',
      hasThread: Boolean(cfg.spaceStateId),
    };
    if (!cfg.apiKey || !cfg.apiBaseUrl) return local;
    try {
      const access = await this.client.getKeyStatus();
      return {
        ...local,
        accessMode: access.access_mode || 'unknown',
        capabilities: access.capabilities || [],
        destructiveUnlocked: Boolean(access.destructive_unlocked),
      };
    } catch (error) {
      return { ...local, accessMode: 'unknown', capabilities: [], destructiveUnlocked: false, accessError: error.message };
    }
  }

  async unlock({ yes = false } = {}) {
    if (!yes && !process.stdin.isTTY) {
      const error = new Error('Refusing to unlock non-interactively without --yes.');
      error.code = 'confirmation_required';
      throw error;
    }
    if (!yes && !await this.ui.promptConfirm('Unlock destructive actions for this API key session?', { default: false })) {
      return { destructive_unlocked: false, cancelled: true };
    }
    const result = await this.client.unlockDestructive();
    if (!result?.approval_token) throw new Error('Mantis did not return an approval token.');
    const cfg = this.configStore.requireAuth();
    const maximum = Date.now() + 60 * 60 * 1000;
    const serverExpiry = Date.parse(result.expires_at || '');
    const approvalExpiresAt = new Date(Number.isFinite(serverExpiry) ? Math.min(serverExpiry, maximum) : maximum).toISOString();
    this.configStore.save({ ...cfg, approvalToken: result.approval_token, approvalExpiresAt });
    return { destructive_unlocked: true };
  }

  async lock() {
    let result;
    try {
      result = await this.client.lockDestructive();
    } finally {
      const cfg = this.configStore.load();
      delete cfg.approvalToken;
      delete cfg.approvalExpiresAt;
      this.configStore.save(cfg);
    }
    return { ...result, destructive_unlocked: false };
  }
}
