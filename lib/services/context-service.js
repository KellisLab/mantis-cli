import { mcpUrl } from '../utils/url.js';

export class ContextService {
  constructor({ configStore }) {
    this.configStore = configStore;
  }

  status() {
    const cfg = this.configStore.load();
    return {
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
  }
}
