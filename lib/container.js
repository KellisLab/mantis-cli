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
import { SelectionService } from './services/selection-service.js';
import { SetupService } from './services/setup-service.js';
import { MapService } from './services/map-service.js';
import { QueryService } from './services/query-service.js';
import { ContextService } from './services/context-service.js';
import { ToolService } from './services/tool-service.js';
import { ExportService } from './services/export-service.js';

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

  const selection = new SelectionService({ configStore, spaces, client, ui });
  const setup = new SetupService({ configStore, selection, claudeSkills, opencodeSkills, codexSkills, ui });
  const map = new MapService({ configStore, client, spaces, csvReader, ui });
  const query = new QueryService({ configStore, spaces });
  const context = new ContextService({ configStore });
  const exporter = new ExportService({ configStore, client });
  const tools = new ToolService({ mcp, exporter });

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
    selection,
    setup,
    map,
    query,
    context,
    tools,
    exporter,
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
