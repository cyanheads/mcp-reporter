/** tests/http.test.ts — Real loopback HTTP verifies modern and legacy SDK serving. */
import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
