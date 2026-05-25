import { DEFAULT_API_BASE, DEVELOPER_PORTAL_URL } from '../constants.js';
import { normalizeBaseUrl, mcpUrl } from '../utils/url.js';

const PROVIDERS = new Set(['claude', 'opencode']);

export class SetupService {
  constructor({ configStore, selection, claudeSkills, opencodeSkills, ui }) {
    this.configStore = configStore;
    this.selection = selection;
    this.claudeSkills = claudeSkills;
    this.opencodeSkills = opencodeSkills;
    this.ui = ui;
  }

  async run() {
    const prev = this.configStore.load();
    this.ui.banner('Mantis setup', 'API credentials and workspace context');

    const apiBaseUrl = normalizeBaseUrl(
      await this.ui.promptInput('Mantis API URL', {
        default: prev.apiBaseUrl || process.env.MANTIS_API_URL || DEFAULT_API_BASE,
      }),
    );
    this.ui.info(`API keys: ${DEVELOPER_PORTAL_URL}`);
    const apiKey = (await this.ui.promptSecret('API key (Ctrl+click link above to open portal)', {
      default: prev.apiKey,
    }))?.trim();
    if (!apiKey) this.ui.die('API key is required.');

    let cfg = { ...prev, apiBaseUrl, apiKey };
    this.configStore.save(cfg);

    if (!cfg.spaceId) {
      cfg = await this.selection.pickSpace();
    } else {
      this.ui.info(`Space: ${cfg.spaceName || cfg.spaceId} (unchanged)`);
    }

    if (!cfg.spaceStateId) {
      if (!cfg.spaceId) this.ui.die('Pick a space before choosing a thread.');
      cfg = await this.selection.pickThread();
    } else {
      this.ui.info(`Thread: ${cfg.spaceStateName || cfg.spaceStateId} (unchanged)`);
    }

    this.configStore.save(cfg);

    console.log('');
    this.ui.success('Setup complete');
    this.ui.info(`Space:  ${cfg.spaceName || '-'} (${cfg.spaceId || '-'})`);
    this.ui.info(`Thread: ${cfg.spaceStateName || '-'} (${cfg.spaceStateId || '-'})`);
    this.ui.info(`MCP:    ${mcpUrl(cfg)}`);
    this.ui.info('Explore with: mantis tools && mantis use get_space_context');
    this.ui.info('Editor skills: mantis setup claude | mantis setup opencode');
    console.log('');
  }

  runProvider(provider) {
    const p = String(provider || '').toLowerCase();
    if (!PROVIDERS.has(p)) {
      throw new Error(`Unknown provider "${provider}". Use: claude, opencode`);
    }

    if (p === 'claude') {
      const { skillsDir, installed } = this.claudeSkills.sync();
      this.ui.banner('Mantis skills → Claude Code');
      this.ui.success(`Synced ${installed.length} skill(s) to ${skillsDir}`);
      for (const s of installed) this.ui.info(`${s.slash}  ← skills/${s.source}`);
      this.ui.info('Try /mantis or /mantis-connect in Claude Code.');
      return { provider: p, skillsDir, installed };
    }

    const { globalSkillsDir, projectSkillsDir, installed } = this.opencodeSkills.sync();
    this.ui.banner('Mantis skills → OpenCode');
    this.ui.success(`Synced ${installed.length} skill(s)`);
    this.ui.info(`Global:  ${globalSkillsDir}`);
    this.ui.info(`Project: ${projectSkillsDir}`);
    for (const s of installed) this.ui.info(`${s.slash}  ← skills/${s.source}`);
    return { provider: p, globalSkillsDir, projectSkillsDir, installed };
  }
}
