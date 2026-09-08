/** tests/fixtures/legacy-server.mjs — Deterministic paginated JSON-RPC peer. */
import { appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

if (process.env.FIXTURE_PID_FILE) appendFileSync(process.env.FIXTURE_PID_FILE, `${process.pid}\n`);
const input = createInterface({ input: process.stdin });
input.on('line', (line) => {
  const request = JSON.parse(line);
  if (request.id === undefined) return;
  let result;
  switch (request.method) {
    case 'server/discover':
      if (process.argv.includes('--silent-probe')) return;
      if (process.argv.includes('--exit-on-probe')) process.exit(0);
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Unsupported method' } })}\n`,
      );
      return;
    case 'initialize':
      result = {
        protocolVersion: request.params.protocolVersion,
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'fixture-server', version: '1.0.0' },
        instructions: 'Fixture instructions',
      };
      break;
    case 'tools/list': {
      const page = Number(request.params?.cursor ?? 0);
      result = {
        tools: [{ name: `tool-${page}`, inputSchema: { type: 'object' } }],
        ...(page < 2 ? { nextCursor: String(page + 1) } : {}),
      };
      break;
    }
    case 'resources/list':
      result = { resources: [] };
      break;
    case 'resources/templates/list':
      result = { resourceTemplates: [] };
      break;
    case 'prompts/list':
      result = { prompts: [{ name: 'greeting', arguments: [{ name: 'person', required: true }] }] };
      break;
    default:
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Unsupported method' } })}\n`,
      );
      return;
  }
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`);
});
