import { DISABLED_MCP_TOOLS } from '../constants.js';

function disabledToolError(name) {
  if (name === 'create_space') {
    return 'create_space is disabled in the CLI. Use: mantis setup or mantis select space';
  }
  return `${name} is disabled in the CLI. Use: mantis create map or mantis create codebase`;
}

export class ToolService {
  constructor({ mcp }) {
    this.mcp = mcp;
  }

  async listTools() {
    const data = await this.mcp.listTools();
    return {
      tools: (data.tools || []).filter((t) => !DISABLED_MCP_TOOLS.has(t.name)),
    };
  }

  useTool(name, args = {}) {
    if (DISABLED_MCP_TOOLS.has(name)) throw new Error(disabledToolError(name));
    return this.mcp.callTool(name, args);
  }
}
