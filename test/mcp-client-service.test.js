import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';

import { McpClientService } from '../lib/impl/mcp-client-service.js';

const { version: packageVersion } = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

test('MCP handshake reports the package.json version', async (t) => {
  // Stand-in MCP endpoint: records the initialize request, then refuses it.
  let clientInfo;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const messages = [].concat(JSON.parse(body));
        clientInfo ??= messages.find((m) => m.method === 'initialize')?.params?.clientInfo;
      } catch { /* not JSON */ }
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'refused by test server' }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const mcp = new McpClientService({
    requireAuth: () => ({
      apiBaseUrl: `http://127.0.0.1:${server.address().port}`,
      apiKey: 'test-key',
      spaceStateId: 'test-thread',
    }),
  });

  await assert.rejects(mcp.listTools());
  assert.deepEqual(clientInfo, { name: 'mantisai-cli', version: packageVersion });
});
