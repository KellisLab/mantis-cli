import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import fs from 'node:fs';
import path from 'node:path';

import { PACKAGE_ROOT } from '../utils/package-root.js';
import { mcpUrl } from '../utils/url.js';

const { version: VERSION } = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));

export class McpClientService {
  constructor(configStore) {
    this.configStore = configStore;
  }

  _headers(cfg) {
    return {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/json',
      ...(cfg.approvalToken ? { 'X-Mantis-Approval': cfg.approvalToken } : {}),
      ...(cfg.spaceStateId ? { 'X-Space-State-ID': String(cfg.spaceStateId) } : {}),
    };
  }

  _clearApproval() {
    if (typeof this.configStore.load !== 'function' || typeof this.configStore.save !== 'function') return;
    const cfg = this.configStore.load();
    if (!cfg.approvalToken) return;
    delete cfg.approvalToken;
    this.configStore.save(cfg);
  }

  async _withClient(fn) {
    const cfg = this.configStore.requireAuth();
    if (!cfg.spaceStateId) {
      throw new Error('No thread configured. Run: mantis setup or mantis select thread');
    }
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl(cfg)), {
      requestInit: { headers: this._headers(cfg) },
    });
    const client = new Client({ name: 'mantisai-cli', version: VERSION });
    try {
      await client.connect(transport);
      return await fn(client);
    } catch (error) {
      if (error?.status === 401 || error?.status === 403 || /\b(401|403)\b/.test(error?.message || '')) {
        this._clearApproval();
      }
      throw error;
    } finally {
      try { await client.close(); } catch { /* connection may not have opened */ }
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
      let detail;
      try { detail = JSON.parse(msg); } catch { detail = null; }
      const error = new Error(detail?.detail || detail?.message || msg);
      error.code = detail?.code || detail?.error;
      error.hint = detail?.hint;
      throw error;
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
