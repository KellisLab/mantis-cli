import assert from 'node:assert/strict';
import test from 'node:test';

import { McpClientService } from '../lib/impl/mcp-client-service.js';
import { mcpUrl } from '../lib/utils/url.js';

test('MCP calls use the developer key and selected thread', () => {
  const config = {
    apiBaseUrl: 'https://mantis.csail.mit.edu/',
    apiKey: 'test_example',
    spaceStateId: 'thread-1',
    approvalToken: 'approval-once',
  };
  const service = new McpClientService({ requireAuth: () => config });

  assert.equal(mcpUrl(config), 'https://mantis.csail.mit.edu/mcp_integrated/');
  assert.deepEqual(service._headers(config), {
    Authorization: 'Bearer test_example',
    Accept: 'application/json',
    'X-Mantis-Approval': 'approval-once',
    'X-Space-State-ID': 'thread-1',
  });
});
