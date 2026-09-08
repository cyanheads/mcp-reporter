/** tests/http.test.ts — Real loopback HTTP verifies modern and legacy SDK serving. */
import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMcpHandler, Server } from '@modelcontextprotocol/server';
import { McpReporter } from '../src/index.js';

for (const protocolEra of ['legacy', 'auto', '2026-07-28'] as const) {
  test(`HTTP ${protocolEra} reports modern definitions and preserves private headers`, async () => {
    const methods: string[] = [];
    const auth: (string | null)[] = [];
    const handler = createMcpHandler(() => {
      const server = new Server(
        { name: 'http-fixture', version: '7.0.0', title: 'HTTP fixture' },
        { capabilities: { tools: {}, prompts: {} }, instructions: 'HTTP instructions' },
      );
      server.setRequestHandler('tools/list', async (request) => ({
        tools: [
          {
            name: request.params?.cursor === undefined ? 'first-tool' : 'second-tool',
            inputSchema: {
              type: 'object',
              properties: { invalid: { type: 'object', 'x-mcp-header': 'Bad Header' } },
            },
            _meta: { complete: true },
          },
        ],
        ...(request.params?.cursor === undefined ? { nextCursor: 'next' } : {}),
      }));
      server.setRequestHandler('prompts/list', async () => ({
        prompts: [{ name: 'http-prompt' }],
      }));
      return server;
    });
    const http = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        auth.push(request.headers.get('authorization'));
        if (request.method === 'POST') {
          const message = await request.clone().json();
          methods.push(message.method);
        }
        return handler.fetch(request);
      },
    });
    const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-http-'));
    try {
      const config = join(dir, 'config.json');
      const outputPath = join(dir, 'report.md');
      await writeFile(
        config,
        JSON.stringify({
          mcpServers: {
            remote: {
              url: `${http.url}private-path?token=query-secret#fragment-secret`,
              headers: { Authorization: 'Bearer header-secret' },
            },
          },
        }),
      );
      await new McpReporter(config, { outputPath, protocolEra }).run();
      const report = await readFile(outputPath, 'utf8');
      for (const value of [
        'first-tool',
        'second-tool',
        'Bad Header',
        'http-prompt',
        'http-fixture',
        'HTTP instructions',
      ])
        expect(report).toContain(value);
      expect(auth.every((value) => value === 'Bearer header-secret')).toBe(true);
      for (const secret of ['header-secret', 'query-secret', 'fragment-secret', 'private-path'])
        expect(report).not.toContain(secret);
      expect(report).toContain(protocolEra === 'legacy' ? 'legacy' : 'modern');
      if (protocolEra === 'legacy') expect(methods).not.toContain('server/discover');
      else {
        expect(methods).toContain('server/discover');
        expect(report).toContain('2026-07-28');
      }
      expect(methods).not.toContain('tools/call');
    } finally {
      await handler.close();
      await http.stop(true);
      await rm(dir, { recursive: true, force: true });
    }
  });
}

for (const status of [401, 403, 500]) {
  test(`HTTP ${status} remains a safe, distinguishable connection failure`, async () => {
    const http = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('private-error-secret', { status }),
    });
    const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-auth-'));
    try {
      const config = join(dir, 'config.json');
      const outputPath = join(dir, 'report.md');
      await writeFile(
        config,
        JSON.stringify({
          mcpServers: {
            remote: { url: `${http.url}secret-path`, headers: { Authorization: 'Bearer secret' } },
          },
        }),
      );
      await new McpReporter(config, { outputPath, protocolEra: 'auto', timeoutMs: 1000 }).run();
      const report = await readFile(outputPath, 'utf8');
      expect(report).toContain('Connection Failures');
      expect(report).not.toContain('secret');
      expect(report).toContain(String(status));
    } finally {
      await http.stop(true);
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test('HTTP discovery timeout is a failure rather than a legacy fallback', async () => {
  let requests = 0;
  const http = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      requests++;
      await new Promise<void>((resolve) =>
        request.signal.addEventListener('abort', () => resolve(), { once: true }),
      );
      return new Response(null, { status: 499 });
    },
  });
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-timeout-'));
  try {
    const config = join(dir, 'config.json');
    const outputPath = join(dir, 'report.md');
    await writeFile(config, JSON.stringify({ mcpServers: { remote: { url: String(http.url) } } }));
    await new McpReporter(config, { outputPath, protocolEra: 'auto', timeoutMs: 50 }).run();
    const report = await readFile(outputPath, 'utf8');
    expect(report).toContain('Connection Failures');
    expect(report.replaceAll('\\', '')).toContain('REQUEST_TIMEOUT');
    expect(requests).toBe(1);
  } finally {
    await http.stop(true);
    await rm(dir, { recursive: true, force: true });
  }
});

for (const stall of ['headers', 'body'] as const) {
  test(`HTTP initialized notification timeout aborts stalled ${stall} and continues reporting`, async () => {
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    let fixtureReleased = false;
    const { promise: notificationClosed, resolve: markClosed } = Promise.withResolvers<void>();
    const http = createServer(async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405).end();
        return;
      }
      let body = '';
      for await (const chunk of request) body += chunk;
      const message = JSON.parse(body);
      if (message.method === 'initialize') {
        response.writeHead(200, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: message.params.protocolVersion,
              serverInfo: { name: 'timeout-fixture', version: '1' },
              capabilities: {},
            },
          }),
        );
      } else if (request.url === '/stalled') {
        response.on('close', markClosed);
        if (stall === 'body') {
          response.writeHead(202, { 'content-type': 'text/plain' });
          response.flushHeaders();
          response.write('unfinished');
        }
        releaseTimer = setTimeout(() => {
          fixtureReleased = true;
          response.end();
        }, 1000);
      } else response.writeHead(202).end();
    });
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    if (!address || typeof address === 'string') throw new Error('Expected loopback TCP address');
    const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-initialized-timeout-'));
    try {
      const config = join(dir, 'config.json');
      const outputPath = join(dir, 'report.md');
      await writeFile(
        config,
        JSON.stringify({
          mcpServers: {
            stalled: { url: `http://127.0.0.1:${address.port}/stalled` },
            healthy: { url: `http://127.0.0.1:${address.port}/healthy` },
          },
        }),
      );
      await new McpReporter(config, { outputPath, timeoutMs: 50 }).run();
      const report = await readFile(outputPath, 'utf8');
      expect(report).toContain('Connection Failures');
      expect(report.replaceAll('\\', '')).toContain('REQUEST_TIMEOUT');
      expect(report).toContain('## healthy');
      await notificationClosed;
      expect(fixtureReleased).toBe(false);
    } finally {
      clearTimeout(releaseTimer);
      http.closeAllConnections();
      await new Promise<void>((resolve) => http.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });
}
