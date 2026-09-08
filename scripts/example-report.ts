/** scripts/example-report.ts — Generate a shareable report from synthetic definitions. */
import { writeFile } from 'node:fs/promises';
import type { ServerReport } from '../src/types/index.js';
import { MarkdownGenerator } from '../src/utils/markdown.js';

const reports: ServerReport[] = [
  {
    id: 'catalog-demo',
    name: 'catalog-demo',
    config: { url: 'https://example.com/mcp' },
    connected: true,
    connectionTime: 12,
    implementation: { name: 'catalog-server', title: 'Catalog', version: '1.0.0' },
    protocolVersion: '2026-07-28',
    protocolEra: 'modern',
    instructions: 'Search the catalog by name. Resource URIs identify catalog entries.',
    advertisedCapabilities: { tools: {}, resources: {}, prompts: {} },
    capabilities: {
      tools: [
        {
          name: 'catalog_search',
          title: 'Search the catalog',
          description: 'Find catalog entries by name.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Name to find.' } },
            required: ['query'],
          },
          outputSchema: {
            type: 'object',
            properties: { names: { type: 'array', items: { type: 'string' } } },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
      ],
      resources: [
        {
          name: 'catalog-overview',
          uri: 'catalog://overview',
          description: 'Catalog summary.',
          mimeType: 'text/plain',
        },
      ],
      resourceTemplates: [
        {
          name: 'catalog-entry',
          uriTemplate: 'catalog://entries/{id}',
          mimeType: 'application/json',
        },
      ],
      prompts: [
        {
          name: 'compare-entries',
          description: 'Compare two catalog entries.',
          arguments: [
            { name: 'first', required: true },
            { name: 'second', required: true },
          ],
        },
      ],
    },
    capabilityStatus: {
      tools: { state: 'complete' },
      resources: { state: 'complete' },
      resourceTemplates: { state: 'complete' },
      prompts: { state: 'complete' },
    },
  },
];
await writeFile('docs/example-report.md', MarkdownGenerator.generateReport(reports));
console.log('Wrote docs/example-report.md from synthetic definitions.');
