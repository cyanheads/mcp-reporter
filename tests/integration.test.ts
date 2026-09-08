/** tests/integration.test.ts — SDK fixtures exercise complete reports and transport cleanup. */
import { expect, spyOn, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ServerCapabilities } from '@modelcontextprotocol/server';
import {
  InMemoryTransport,
  ProtocolError,
  ProtocolErrorCode,
  Server,
} from '@modelcontextprotocol/server';
import { McpReporter } from '../src/index.js';
import type { ReportOptions } from '../src/types/index.js';

async function fixture(
  capabilities: ServerCapabilities = { tools: {}, resources: {}, prompts: {} },
) {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-memory-'));
  const configPath = join(dir, 'config.json');
  const outputPath = join(dir, 'report.md');
  await writeFile(
    configPath,
    JSON.stringify({ mcpServers: { fixture: { command: 'unused', args: [] } } }),
  );
  const server = new Server(
    { name: 'fixture-implementation', title: 'Fixture title', version: '3.2.1' },
    {
      supportedProtocolVersions: ['2026-07-28', '2025-11-25', '2025-03-26', '2024-11-05'],
      capabilities,
      instructions: 'Read the catalog.\nDo not execute tools.',
    },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = spyOn(clientTransport, 'send');
  const close = spyOn(clientTransport, 'close');
  const output = {
    tools: [
      {
        name: 'lookup',
        title: 'Lookup title',
        inputSchema: {
          type: 'object' as const,
          properties: { id: { type: 'string', 'x-mcp-header': 'Record' } },
        },
        outputSchema: { type: 'object' as const },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        icons: [{ src: 'https://example.com/icon.svg' }],
        _meta: { vendor: { nested: ['retained'] } },
      },
    ],
  };
  if (capabilities.tools) server.setRequestHandler('tools/list', async () => output);
  if (capabilities.resources) {
    server.setRequestHandler('resources/list', async () => ({
      resources: [
        {
          name: 'record',
          title: 'Record',
          uri: 'data://record',
          mimeType: 'text/plain',
          size: 17,
          annotations: { audience: ['assistant'], priority: 0.5 },
        },
      ],
    }));
    server.setRequestHandler('resources/templates/list', async () => ({
      resourceTemplates: [
        { name: 'records', uriTemplate: 'data://{id}', _meta: { retainedTemplate: true } },
      ],
    }));
  }
  if (capabilities.prompts)
    server.setRequestHandler('prompts/list', async () => ({
      prompts: [
        {
          name: 'greeting',
          arguments: [{ name: 'person', description: 'A name', required: true }],
        },
        { name: 'empty-prompt' },
      ],
    }));
  await server.connect(serverTransport);
  const run = async (options: Partial<ReportOptions> = {}) => {
    await new McpReporter(configPath, {
      outputPath,
      transportFactory: () => clientTransport,
      ...options,
    }).run();
    return readFile(outputPath, 'utf8');
  };
  return {
    dir,
    configPath,
    outputPath,
    server,
    clientTransport,
    serverTransport,
    send,
    close,
    run,
    cleanup: async () => {
      await server.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

for (const protocolEra of ['legacy', 'auto'] as const) {
  test(`${protocolEra} collects all descriptor classes and metadata without executing them`, async () => {
    const f = await fixture();
    try {
      const report = await f.run({ protocolEra });
      for (const value of [
        'lookup',
        'Lookup title',
        'Output Schema',
        'readOnlyHint',
        'retained',
        'data://record',
        'data://{id}',
        'greeting',
        'person',
        'empty-prompt',
        'fixture-implementation',
        '3.2.1',
        'Read the catalog',
      ]) {
        expect(report).toContain(value);
      }
      const methods = f.send.mock.calls.map(([message]) =>
        'method' in message ? message.method : undefined,
      );
      expect(methods).not.toContain('tools/call');
      expect(methods).not.toContain('resources/read');
      expect(methods).not.toContain('prompts/get');
      expect(methods).not.toContain('ping');
      if (protocolEra === 'legacy') {
        expect(methods).not.toContain('server/discover');
        expect(report).toContain('legacy');
      } else {
        expect(methods).toContain('server/discover');
        expect(report).toContain('legacy');
      }
      expect(f.close).toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });
}

test('unadvertised, successful empty, and failed lists are distinct', async () => {
  const f = await fixture({ tools: {}, resources: {} });
  try {
    f.server.setRequestHandler('tools/list', async () => ({ tools: [] }));
    f.server.setRequestHandler('resources/list', async () => {
      throw new ProtocolError(ProtocolErrorCode.MethodNotFound, 'SECRET peer message');
    });
    const report = await f.run({ includeServerMetadata: false });
    expect(report).toContain('No entries returned');
    expect(report).toContain('Not advertised');
    expect(report).toContain('Incomplete');
    expect(report).toContain('-32601');
    expect(report).not.toContain('SECRET');
    expect(report).toContain('data://{id}');
    expect(
      f.send.mock.calls.some(
        ([message]) => 'method' in message && message.method === 'prompts/list',
      ),
    ).toBe(false);
  } finally {
    await f.cleanup();
  }
});

for (const mode of [
  'three-pages',
  'empty-page',
  'empty-cursor',
  'cycle',
  'limit',
  'late-error',
] as const) {
  test(`${mode} pagination preserves honest counts for every list`, async () => {
    const f = await fixture();
    const calls: Record<string, number> = {};
    function page(method: string, cursor: string | undefined) {
      calls[method] = (calls[method] ?? 0) + 1;
      const n = calls[method] - 1;
      if (mode === 'late-error' && n === 2)
        throw new ProtocolError(ProtocolErrorCode.InternalError, 'fixture failure');
      const nextCursor =
        mode === 'cycle'
          ? 'same'
          : mode === 'limit'
            ? String(n + 1)
            : n < 2
              ? mode === 'empty-cursor' && n === 0
                ? ''
                : String(n + 1)
              : undefined;
      if (mode === 'empty-cursor' && n === 1) expect(cursor).toBe('');
      return { n, nextCursor, empty: mode === 'empty-page' && n === 1 };
    }
    f.server.setRequestHandler('tools/list', async (request) => {
      const p = page('tools', request.params?.cursor);
      return {
        tools: p.empty ? [] : [{ name: `tool-page-${p.n}`, inputSchema: { type: 'object' } }],
        nextCursor: p.nextCursor,
      };
    });
    f.server.setRequestHandler('resources/list', async (request) => {
      const p = page('resources', request.params?.cursor);
      return {
        resources: p.empty ? [] : [{ name: `resource-page-${p.n}`, uri: `data://${p.n}` }],
        nextCursor: p.nextCursor,
      };
    });
    f.server.setRequestHandler('resources/templates/list', async (request) => {
      const p = page('templates', request.params?.cursor);
      return {
        resourceTemplates: p.empty
          ? []
          : [{ name: `template-page-${p.n}`, uriTemplate: `data://${p.n}/{id}` }],
        nextCursor: p.nextCursor,
      };
    });
    f.server.setRequestHandler('prompts/list', async (request) => {
      const p = page('prompts', request.params?.cursor);
      return { prompts: p.empty ? [] : [{ name: `prompt-page-${p.n}` }], nextCursor: p.nextCursor };
    });
    try {
      const report = await f.run({ maxPages: mode === 'limit' ? 2 : 10 });
      for (const label of ['tool', 'resource', 'template', 'prompt'])
        expect(report).toContain(`${label}-page-0`);
      if (['three-pages', 'empty-page', 'empty-cursor'].includes(mode)) {
        for (const label of ['tool', 'resource', 'template', 'prompt'])
          expect(report).toContain(`${label}-page-2`);
        expect(report).not.toContain('Incomplete');
      } else {
        expect(report).toContain('incomplete');
        expect(Object.values(calls).every((count) => count <= 3)).toBe(true);
      }
    } finally {
      await f.cleanup();
    }
  });
}

test('a malformed response is incomplete, not an empty successful list', async () => {
  const f = await fixture({ tools: {} });
  const send = f.serverTransport.send.bind(f.serverTransport);
  spyOn(f.serverTransport, 'send').mockImplementation((message) =>
    send(
      'result' in message && 'tools' in message.result
        ? { ...message, result: { tools: 'invalid' } }
        : message,
    ),
  );
  try {
    const report = await f.run();
    expect(report).toContain('incomplete');
    expect(report).not.toContain('No entries returned');
  } finally {
    await f.cleanup();
  }
});

test('report-write failure closes the successful connection', async () => {
  const f = await fixture();
  try {
    await expect(f.run({ outputPath: f.dir })).rejects.toThrow();
    expect(f.close).toHaveBeenCalled();
  } finally {
    await f.cleanup();
  }
});

test('injected startup failure closes the transport and skips disabled entries', async () => {
  const f = await fixture();
  let starts = 0;
  let closes = 0;
  try {
    await writeFile(
      f.configPath,
      JSON.stringify({
        mcpServers: {
          disabled: { command: 'unused', disabled: true },
          failed: { command: 'unused', env: { KEY: 'sentinel' } },
          working: { command: 'unused' },
        },
      }),
    );
    const report = await f.run({
      transportFactory: (_config, id) => {
        starts++;
        if (id === 'working') return f.clientTransport;
        return {
          start: async () => {
            throw new Error('sentinel');
          },
          send: async () => {},
          close: async () => {
            closes++;
          },
        };
      },
    });
    expect(starts).toBe(2);
    expect(closes).toBeGreaterThan(0);
    expect(report).toContain('Connection Failures');
    expect(report).toContain('lookup');
    expect(report).not.toContain('sentinel');
  } finally {
    await f.cleanup();
  }
});

test('raw collection retains advertised header declarations', async () => {
  const f = await fixture({ tools: {} });
  f.server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'invalid-header-tool',
        inputSchema: {
          type: 'object',
          properties: { data: { type: 'object', 'x-mcp-header': 'Bad Name' } },
        },
      },
    ],
  }));
  try {
    const report = await f.run();
    expect(report).toContain('invalid-header-tool');
    expect(report).toContain('Bad Name');
  } finally {
    await f.cleanup();
  }
});
