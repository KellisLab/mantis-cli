import { DEFAULT_API_BASE, DEVELOPER_PORTAL_URL } from '../constants.js';
import { normalizeBaseUrl, mcpUrl } from '../utils/url.js';

const PROVIDERS = new Set(['claude', 'opencode', 'codex']);

export class SetupService {
  constructor({ configStore, selection, claudeSkills, opencodeSkills, codexSkills, ui }) {
    this.configStore = configStore;
    this.selection = selection;
    this.claudeSkills = claudeSkills;
    this.opencodeSkills = opencodeSkills;
    this.codexSkills = codexSkills;
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
    this.ui.info('Editor skills: mantis setup claude | opencode | codex');
    console.log('');
  }

  runProvider(provider, { project = false } = {}) {
    const p = String(provider || '').toLowerCase();
    if (!PROVIDERS.has(p)) {
      throw new Error(`Unknown provider "${provider}". Use: claude, opencode, codex`);
    }

    if (p === 'claude') {
      const { skillsDir, installed } = this.claudeSkills.sync();
      this.ui.banner('Mantis skills → Claude Code');
      this.ui.success(`Synced ${installed.length} skill(s) to ${skillsDir}`);
      for (const s of installed) this.ui.info(`${s.slash}  ← skills/${s.source}`);
      this.ui.info('Try /mantis or /mantis-connect in Claude Code.');
      return { provider: p, skillsDir, installed };
    }

    if (p === 'opencode') {
      const { globalSkillsDir, projectSkillsDir, installed } = this.opencodeSkills.sync();
      this.ui.banner('Mantis skills → OpenCode');
      this.ui.success(`Synced ${installed.length} skill(s)`);
      this.ui.info(`Global:  ${globalSkillsDir}`);
      this.ui.info(`Project: ${projectSkillsDir}`);
      for (const s of installed) this.ui.info(`${s.slash}  ← skills/${s.source}`);
      return { provider: p, globalSkillsDir, projectSkillsDir, installed };
    }

    const { globalSkillsDir, projectSkillsDir, installed } = this.codexSkills.sync(undefined, { project });
    this.ui.banner('Mantis skills → Codex');
    this.ui.success(`Synced ${installed.length} skill(s)`);
    this.ui.info(`USER:  ${globalSkillsDir}`);
    if (projectSkillsDir) {
      this.ui.info(`REPO:  ${projectSkillsDir}`);
      this.ui.info('Same skill names in USER + REPO may appear twice in Codex; disable one via /skills if needed.');
    } else {
      this.ui.info('Repo copy skipped. Re-run with --project to also write ./.agents/skills/ for team commit.');
    }
    for (const s of installed) this.ui.info(`$${s.name}  ← skills/${s.source}`);
    this.ui.info('Invoke with $mantis or /skills. Restart Codex if new skills do not appear.');
    return { provider: p, globalSkillsDir, projectSkillsDir, installed };
  }
}
