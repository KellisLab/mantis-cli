import { FileConfigStore } from './impl/file-config-store.js';
import { HttpMantisClient } from './impl/http-mantis-client.js';
import { McpClientService } from './impl/mcp-client-service.js';
import { SpaceRepositoryImpl } from './impl/space-repository.js';
import { InquirerUiService } from './impl/inquirer-ui-service.js';
import { FastGlobCodebaseIndexer } from './impl/fast-glob-codebase-indexer.js';
import { FsCsvReader } from './impl/fs-csv-reader.js';
import { ClaudeSkillsService } from './impl/claude-skills-service.js';
import { OpencodeSkillsService } from './impl/opencode-skills-service.js';
import { CodexSkillsService } from './impl/codex-skills-service.js';
import { CursorSkillsService } from './impl/cursor-skills-service.js';
import { WindsurfSkillsService } from './impl/windsurf-skills-service.js';
import { CopilotSkillsService } from './impl/copilot-skills-service.js';
import { AntigravitySkillsService } from './impl/antigravity-skills-service.js';
import { SelectionService } from './services/selection-service.js';
import { SetupService } from './services/setup-service.js';
import { MapService } from './services/map-service.js';
import { QueryService } from './services/query-service.js';
import { ContextService } from './services/context-service.js';
import { ToolService } from './services/tool-service.js';
import { ExportService } from './services/export-service.js';
import { ProjectionService } from './services/projection-service.js';

export function createContainer(overrides = {}) {
  const configStore = overrides.configStore ?? new FileConfigStore();
  const client = overrides.client ?? new HttpMantisClient(configStore);
  const spaces = overrides.spaces ?? new SpaceRepositoryImpl(client);
  const ui = overrides.ui ?? new InquirerUiService();
  const mcp = overrides.mcp ?? new McpClientService(configStore);
  const codebaseIndexer = overrides.codebaseIndexer ?? new FastGlobCodebaseIndexer();
  const csvReader = overrides.csvReader ?? new FsCsvReader();
  const claudeSkills = overrides.claudeSkills ?? new ClaudeSkillsService();
  const opencodeSkills = overrides.opencodeSkills ?? new OpencodeSkillsService();
  const codexSkills = overrides.codexSkills ?? new CodexSkillsService();
  const cursorSkills = overrides.cursorSkills ?? new CursorSkillsService();
  const windsurfSkills = overrides.windsurfSkills ?? new WindsurfSkillsService();
  const copilotSkills = overrides.copilotSkills ?? new CopilotSkillsService();
  const antigravitySkills = overrides.antigravitySkills ?? new AntigravitySkillsService();

  const selection = new SelectionService({ configStore, spaces, client, ui });
  const setup = new SetupService({
    configStore, selection, ui,
    claudeSkills, opencodeSkills, codexSkills,
    cursorSkills, windsurfSkills, copilotSkills, antigravitySkills,
  });
  const map = new MapService({ configStore, client, spaces, csvReader, ui });
  const query = new QueryService({ configStore, spaces });
  const context = new ContextService({ configStore });
  const exporter = new ExportService({ configStore, client });
  const projection = new ProjectionService({ configStore, client });
  const tools = new ToolService({ mcp, exporter, projection });

  return {
    configStore,
    client,
    spaces,
    ui,
    mcp,
    codebaseIndexer,
    csvReader,
    claudeSkills,
    opencodeSkills,
    codexSkills,
    cursorSkills,
    windsurfSkills,
    copilotSkills,
    antigravitySkills,
    selection,
    setup,
    map,
    query,
    context,
    tools,
    exporter,
    projection,
  };
}

let _container;

export function getContainer() {
  if (!_container) _container = createContainer();
  return _container;
}

export function resetContainer() {
  _container = undefined;
}
