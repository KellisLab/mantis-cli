export const DEFAULT_API_BASE = 'https://kellis-h200-1.csail.mit.edu';
export const DEFAULT_THREAD_NAME = 'Main';
export const DEVELOPER_PORTAL_URL = 'https://mantis.csail.mit.edu/developer/#keys';
export const CONFIG_NAME = 'config.json';
export const BROWSE_PAGE = 20;
export const API_PAGE = 100;

/** MCP tools disabled in CLI — use `mantis create map` / setup instead */
export const DISABLED_MCP_TOOLS = new Set([
  'create_space',
  'create_map_from_url',
  'modify_map_from_url',
  // sandbox-bound: require an X-Chat-ID + live AgentSession container that the
  // CLI has no way to provide. only usable by in-sandbox cc/oc agents.
  'export',
  'cite_file',
  // notebook cell tools: hidden from cc/oc on the API side and not intended
  // for agent/CLI use — cells round-trip through the user's notebook UI.
  'add_cell',
  'edit_cell',
  'delete_cell',
  'execute_cell',
  'get_cell',
  'get_cell_count',
  'check_task_status',
]);
