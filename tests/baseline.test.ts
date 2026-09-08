/** tests/baseline.test.ts — Existing report behavior and credential regression. */
import { expect, spyOn, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McpReporter } from '../src/index.js';
import { MarkdownGenerator } from '../src/utils/markdown.js';

test('report includes discovered tools, resources, templates and connection failures', () => {
  const base = {
    id: 'fixture',
    name: 'fixture',
    config: { command: 'node', args: [] },
    connected: true,
    capabilities: {
      tools: [
        { name: 'lookup', description: 'Find records', inputSchema: { type: 'object' as const } },
      ],
      resources: [{ name: 'record', uri: 'data://record' }],
      resourceTemplates: [{ name: 'records', uriTemplate: 'data://{id}' }],
    },
  };
  const report = MarkdownGenerator.generateReport([
    base,
    { ...base, id: 'failed', connected: false, error: 'Connection failed' },
  ]);
  for (const value of [
    'lookup',
    'Find records',
    'data://record',
    'data://{id}',
    'Connection Failures',
    'failed',
  ])
    expect(report).toContain(value);
});

test('disabled servers are skipped and failed connections still produce a report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-test-'));
  const log = spyOn(console, 'log').mockImplementation(() => {});
  const error = spyOn(console, 'error').mockImplementation(() => {});
  try {
    const config = join(dir, 'config.json');
    const outputPath = join(dir, 'report.md');
    await writeFile(
      config,
      JSON.stringify({
        mcpServers: {
          disabled: { command: 'missing', args: [], disabled: true },
          failed: { command: join(dir, 'missing-command'), args: [] },
        },
      }),
    );
    await new McpReporter(config, { outputPath, progressCallback: () => {} }).run();
    const report = await readFile(outputPath, 'utf8');
    expect(report).toContain('Connection Failures');
    expect(report).not.toContain('disabled');
  } finally {
    log.mockRestore();
    error.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

test('configured credentials never reach diagnostics or the report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-test-'));
  const messages: unknown[][] = [];
  const log = spyOn(console, 'log').mockImplementation((...args) => {
    messages.push(args);
  });
  const error = spyOn(console, 'error').mockImplementation((...args) => {
    messages.push(args);
  });
  const secret = 'fixture-secret-never-log';
  try {
    const config = join(dir, 'config.json');
    const outputPath = join(dir, 'report.md');
    await writeFile(
      config,
      JSON.stringify({
        mcpServers: {
          failed: { command: join(dir, 'missing'), args: [], env: { API_KEY: secret } },
        },
      }),
    );
    await new McpReporter(config, {
      outputPath,
      progressCallback: (event) => {
        messages.push([event]);
      },
    }).run();
    expect(JSON.stringify(messages) + (await readFile(outputPath, 'utf8'))).not.toContain(secret);
  } finally {
    log.mockRestore();
    error.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});
