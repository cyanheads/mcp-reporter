/** tests/fixtures/modern-server.mjs — Both-era SDK stdio serving fixture. */
import { Server } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

serveStdio(() => {
  const server = new Server(
    { name: 'modern-stdio', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler('tools/list', async () => ({
    tools: [{ name: 'modern-tool', inputSchema: { type: 'object' } }],
  }));
  return server;
});
