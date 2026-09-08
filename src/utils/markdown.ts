/** src/utils/markdown.ts — Portable Markdown for server capability catalogs. */
import type { ReportOptions, ServerReport, ToolInfo } from '../types/index.js';

const labels = {
  tools: 'Tools',
  resources: 'Direct Resources',
  resourceTemplates: 'Resource Templates',
  prompts: 'Prompts',
} as const;
/** Escape text nodes in raw HTML without adding Markdown backslashes. */
function htmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\r\n]+/g, ' ');
}
/** Escape server text in Markdown tables and headings. */
function text(value: string): string {
  return htmlText(value).replace(/([\\`*_[\]|])/g, '\\$1');
}
function json(value: unknown): string {
  const body = JSON.stringify(value, null, 2);
  const runs = body.match(/`+/g) ?? [];
  const fence = '`'.repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
  return `${fence}json\n${body}\n${fence}\n\n`;
}
function table(headers: string[], rows: string[][]): string {
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.join(' | ')} |\n`).join('')}\n`;
}
function count(server: ServerReport, key: keyof typeof labels): string {
  const status = server.capabilityStatus?.[key];
  if (status?.state === 'not-advertised') return 'Not advertised';
  return `${server.capabilities[key]?.length ?? 0}${status?.state === 'incomplete' ? ' (incomplete)' : ''}`;
}
function endpoint(url: string): string {
  const parsed = new URL(url);
  // Paths and query values may themselves be credentials; show the origin only.
  return parsed.origin;
}

/** Render a collected report without CSS or remote media requests. */
export const MarkdownGenerator = {
  /** Generate the report; existing callers may omit rendering options. */
  generateReport(servers: ServerReport[], options: Partial<ReportOptions> = {}): string {
    const settings = {
      includeInputSchemas: true,
      includeServerMetadata: true,
      includeExamples: true,
      ...options,
    };
    const connected = servers.filter((server) => server.connected);
    const failed = servers.filter((server) => !server.connected);
    let output = `# MCP Server Capabilities Report\n\nGenerated on: ${new Date().toISOString()}\n\n## Executive Summary\n\n`;
    output += table(
      ['Metric', 'Count'],
      [
        ['Configured servers', String(servers.length)],
        ['Connected servers', String(connected.length)],
        ['Failed connections', String(failed.length)],
        ...Object.entries(labels).map(([key, label]) => [
          label,
          String(
            connected.reduce(
              (sum, server) => sum + (server.capabilities[key as keyof typeof labels]?.length ?? 0),
              0,
            ),
          ),
        ]),
      ],
    );
    if (
      connected.some((server) =>
        Object.values(server.capabilityStatus ?? {}).some(
          (status) => status.state === 'incomplete',
        ),
      )
    )
      output +=
        'Some lists are incomplete. Counts include collected entries only; see each server for details.\n\n';
    if (failed.length)
      output += `### Connection Failures\n\n${table(
        ['Server ID', 'Error'],
        failed.map((server) => [text(server.id), text(server.error ?? 'Connection failed')]),
      )}`;
    output += `### Connected Servers Overview\n\n${table(
      ['Server', ...Object.values(labels)],
      connected.map((server) => [
        text(server.id),
        ...Object.keys(labels).map((key) => count(server, key as keyof typeof labels)),
      ]),
    )}`;
    output +=
      'Descriptors and annotations are server-reported hints, not verified safety or callability guarantees.\n\n';
    output += '## Table of Contents\n\n';
    connected.forEach((server, index) => {
      output += `${index + 1}. [${text(server.id)}](#server-${index + 1})\n`;
    });
    output += '\n';
    connected.forEach((server, index) => {
      output += `<a id="server-${index + 1}"></a>\n\n## ${text(server.id)}\n\n`;
      if (settings.includeServerMetadata) {
        output += '### Server Information\n\n';
        output += table(
          ['Field', 'Value'],
          [
            [
              'Transport',
              server.config.url !== undefined
                ? `Streamable HTTP (${text(endpoint(server.config.url))}; endpoint path omitted)`
                : 'stdio',
            ],
            ['Implementation', text(server.implementation?.name ?? 'Unknown')],
            ['Title', text(server.implementation?.title ?? 'Not supplied')],
            ['Version', text(server.implementation?.version ?? 'Unknown')],
            ['Protocol version', text(server.protocolVersion ?? 'Unknown')],
            ['Protocol era', text(server.protocolEra ?? 'Unknown')],
            ...(server.connectionTime === undefined
              ? []
              : [['Connection time', `${server.connectionTime}ms`]]),
          ],
        );
        if (server.implementation) {
          const metadata = Object.fromEntries(
            Object.entries(server.implementation).filter(
              ([key]) => !['name', 'title', 'version'].includes(key),
            ),
          );
          if (Object.keys(metadata).length)
            output += `#### Implementation metadata\n\n${json(metadata)}`;
        }
        if (server.advertisedCapabilities)
          output += `#### Advertised capabilities\n\n${json(server.advertisedCapabilities)}`;
        if (server.instructions)
          output += `<details>\n<summary>Server instructions</summary>\n\n${json(server.instructions)}\n</details>\n\n`;
      }
      for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
        const entries = server.capabilities[key] ?? [];
        output += `### ${labels[key]} (${count(server, key)})\n\n`;
        const status = server.capabilityStatus?.[key];
        if (status?.state === 'not-advertised') {
          output += 'This capability is not advertised by the server.\n\n';
          continue;
        }
        if (status?.state === 'incomplete') output += `**Incomplete:** ${text(status.error)}\n\n`;
        if (!entries.length) {
          output +=
            status?.state === 'incomplete'
              ? 'No entries collected.\n\n'
              : 'No entries returned.\n\n';
          continue;
        }
        output += table(
          ['Name', 'Title', 'Description'],
          entries.map((entry) => [
            text(entry.name),
            text(
              entry.title ??
                ('annotations' in entry &&
                entry.annotations &&
                'title' in entry.annotations &&
                typeof entry.annotations.title === 'string'
                  ? entry.annotations.title
                  : ''),
            ),
            text(entry.description ?? ''),
          ]),
        );
        for (const entry of entries) {
          output += `<details>\n<summary>${htmlText(entry.name)}</summary>\n\n`;
          const data: Record<string, unknown> = { ...entry };
          if (key === 'tools') {
            const tool = entry as ToolInfo;
            delete data.inputSchema;
            delete data.outputSchema;
            delete data.examples;
            if (settings.includeInputSchemas) {
              output += `#### Input Schema\n\n${json(tool.inputSchema)}`;
            }
            if (tool.outputSchema) output += `#### Output Schema\n\n${json(tool.outputSchema)}`;
            if (settings.includeExamples && tool.examples?.length)
              output += `#### Examples\n\n${json(tool.examples)}`;
          }
          output += `#### Definition\n\n${json(data)}</details>\n\n`;
        }
      }
    });
    return output;
  },
};
