import { DISABLED_MCP_TOOLS } from '../constants.js';

const NOTEBOOK_TOOLS = new Set([
  'add_cell',
  'edit_cell',
  'delete_cell',
  'execute_cell',
  'get_cell',
  'get_cell_count',
  'check_task_status',
]);

// Synthetic tool entry for `export`. The server-side MCP `export` needs an
// agent sandbox the CLI can't provide, so it's filtered from the raw list;
// this local variant resolves the URI via REST and writes parquet under
// ~/.mantis/mantis_data/ on the user's machine instead.
const LOCAL_EXPORT_TOOL = {
  name: 'export',
  description:
    'Export every row behind a Mantis URI to a local parquet file under '
    + '~/.mantis/mantis_data/. Use for bulk-row analysis (correlations, '
    + 'distributions, top-K, outliers) instead of paging inspect(). Read it '
    + "back with pandas: pd.read_parquet(<path>). Always adds _point_id, "
    + '_cluster_id, _cluster_label. Capped at 200,000 rows.',
  inputSchema: {
    type: 'object',
    properties: {
      uri: {
        type: 'string',
        description: 'Mantis URI resolving to a point set (map, cluster, bag, point, selection).',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Column names to project. Omit to export all fields.',
      },
      filename: {
        type: 'string',
        description: 'Output filename (basename only). Defaults to <uri-tail>_<n>rows.parquet.',
      },
      include_embedding: {
        type: 'boolean',
        description: 'Add _embedding (1536-d) and _embedding_2d columns.',
      },
    },
    required: ['uri'],
  },
};

function normalizeFields(fields) {
  if (fields == null) return undefined;
  if (Array.isArray(fields)) return fields;
  // `--fields title,rating` arrives as a comma string via parseToolArgs.
  return String(fields).split(',').map((s) => s.trim()).filter(Boolean);
}

function disabledToolError(name) {
  if (name === 'create_space') {
    return 'create_space is disabled in the CLI. Use: mantis setup or mantis select space';
  }
  if (name === 'cite_file') {
    return `${name} is unavailable in the CLI — it needs an agent sandbox (X-Chat-ID + live container) that the CLI cannot provide. It only works for in-sandbox claude_code/opencode agents.`;
  }
  if (NOTEBOOK_TOOLS.has(name)) {
    return `${name} is unavailable in the CLI — notebook cell tools round-trip through the user's notebook UI and are not intended for agent/CLI use.`;
  }
  return `${name} is disabled in the CLI. Use: mantis create map or mantis create codebase`;
}

export class ToolService {
  constructor({ mcp, exporter }) {
    this.mcp = mcp;
    this.exporter = exporter;
  }

  async listTools() {
    const data = await this.mcp.listTools();
    const tools = (data.tools || []).filter((t) => !DISABLED_MCP_TOOLS.has(t.name));
    // inject the local export variant so it's discoverable via `mantis tools`.
    tools.push(LOCAL_EXPORT_TOOL);
    return { tools };
  }

  useTool(name, args = {}) {
    if (name === 'export') {
      return this.exporter.exportUri(args.uri, {
        fields: normalizeFields(args.fields),
        out: args.filename ?? args.out,
        includeEmbedding: args.include_embedding ?? args.includeEmbedding ?? false,
      });
    }
    if (DISABLED_MCP_TOOLS.has(name)) throw new Error(disabledToolError(name));
    return this.mcp.callTool(name, args);
  }
}
