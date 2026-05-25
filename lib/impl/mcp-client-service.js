import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { mcpUrl } from '../utils/url.js';

export class McpClientService {
  constructor(configStore) {
    this.configStore = configStore;
  }

  _headers(cfg) {
    return {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/json',
      ...(cfg.spaceStateId ? { 'X-Space-State-ID': String(cfg.spaceStateId) } : {}),
    };
  }

  async _withClient(fn) {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceStateId) {
      throw new Error('No thread configured. Run: mantis setup or mantis select thread');
    }
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl(cfg)), {
      requestInit: { headers: this._headers(cfg) },
    });
    const client = new Client({ name: 'mantisai-cli', version: '3.0.1' });
    await client.connect(transport);
    try {
      return await fn(client);
    } finally {
      await client.close();
    }
  }

  async listTools() {
    const result = await this._withClient((client) => client.listTools());
    return {
      tools: (result.tools || []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  async callTool(name, args = {}) {
    const result = await this._withClient((client) => client.callTool({ name, arguments: args }));
    if (result.isError) {
      const msg = result.content?.find((c) => c.type === 'text')?.text || 'Tool call failed';
      throw new Error(msg);
    }
    if (result.structuredContent) return result.structuredContent;
    const text = result.content?.find((c) => c.type === 'text')?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { text };
      }
    }
    return result;
  }
}
