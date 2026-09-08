/** tests/reporting.test.ts — Reporting regressions against real JSON-RPC boundaries. */
import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { McpReporter } from '../src/index.js';
import { MarkdownGenerator } from '../src/utils/markdown.js';

test('all three list pages reach the report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-pages-'));
  try {
    const config = join(dir, 'config.json');
    const outputPath = join(dir, 'report.md');
    await writeFile(
      config,
      JSON.stringify({
        mcpServers: {
          fixture: { command: 'node', args: [resolve('tests/fixtures/legacy-server.mjs')] },
        },
      }),
    );
    await new McpReporter(config, { outputPath, progressCallback: () => {} }).run();
    const report = await readFile(outputPath, 'utf8');
    expect(report).toContain('tool-0');
    expect(report).toContain('tool-1');
    expect(report).toContain('tool-2');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

const server = {
  id: 'fixture',
  name: 'fixture',
  config: { command: 'node', args: [] },
  connected: true,
  capabilities: {
    tools: [{ name: 'lookup', inputSchema: { type: 'object' as const } }],
    resources: [],
    resourceTemplates: [],
  },
};
test('report uses portable Markdown without inline CSS', () => {
  expect(MarkdownGenerator.generateReport([server])).not.toContain('style=');
});
test('schema and metadata exclusions affect rendered output', () => {
  const markdown = MarkdownGenerator.generateReport([server], {
    includeInputSchemas: false,
    includeServerMetadata: false,
  });
  expect(markdown).not.toContain('Input Schema');
  expect(markdown).not.toContain('Server Information');
});

test('examples and output schema retain compatibility independently of input schema', () => {
  const supplied = {
    ...server,
    connectionTime: 0,
    capabilities: {
      ...server.capabilities,
      tools: [
        {
          ...server.capabilities.tools[0],
          outputSchema: { type: 'object' as const, properties: { retained: { type: 'string' } } },
          examples: [{ in: { question: 'sample' }, out: { answer: 'supplied-example' } }],
        },
      ],
    },
  };
  const report = MarkdownGenerator.generateReport([supplied], { includeInputSchemas: false });
  expect(report).not.toContain('Input Schema');
  expect(report).toContain('Output Schema');
  expect(report).toContain('supplied-example');
  expect(report).toContain('0ms');
  expect(MarkdownGenerator.generateReport([supplied], { includeExamples: false })).not.toContain(
    'supplied-example',
  );
});
test('server-provided delimiters cannot break table rows or details fences', () => {
  const hostile = {
    ...server,
    id: '<script>x</script>|row\nnext',
    capabilities: {
      ...server.capabilities,
      tools: [
        {
          name: '</summary>```|tool',
          description: 'line1\nline2|cell',
          inputSchema: {
            type: 'object' as const,
            description: '````\n</details>\n<script>bad</script>',
          },
        },
      ],
    },
  };
  const report = MarkdownGenerator.generateReport([hostile]);
  expect(report).not.toContain('<script>x</script>');
  expect(report).toContain('\\|row next');
  expect(report).toContain('`````json');
});

test('implementation metadata and raw HTML summary labels render faithfully', () => {
  const fixture = {
    ...server,
    implementation: {
      name: 'identity',
      version: '1.0.0',
      description: 'identity-description',
      websiteUrl: 'https://example.com/identity',
      icons: [{ src: 'https://example.com/identity.svg' }],
    },
    capabilities: {
      ...server.capabilities,
      tools: [{ ...server.capabilities.tools[0], name: 'catalog_search' }],
    },
  };
  const markdown = MarkdownGenerator.generateReport([fixture]);
  expect(markdown).toContain('identity-description');
  expect(markdown).toContain('https://example.com/identity.svg');
  const html = Bun.markdown.html(markdown);
  expect(html).toContain('<summary>catalog_search</summary>');
  expect(html).not.toContain('<summary>catalog\\_search</summary>');
});
