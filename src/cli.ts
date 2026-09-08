#!/usr/bin/env node
/** src/cli.ts — Command-line options and exit status for capability reports. */

import { resolve } from 'node:path';
import { Command, InvalidArgumentError, Option } from 'commander';
import { McpReporter } from './index.js';
import { isEntryPoint } from './is-entry-point.js';
import type { ProtocolEraOption } from './types/index.js';
import { ProgressReporter } from './utils/progress.js';
import { VERSION } from './version.js';

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new InvalidArgumentError('Expected a positive integer.');
  return parsed;
}
/** Run the CLI; only this entry point owns console progress. */
export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command()
    .name('mcp-reporter')
    .description('Generate Markdown capability reports for MCP servers')
    .version(VERSION)
    .option('-c, --config <path>', 'MCP servers configuration file', 'mcp-servers.json')
    .option('-o, --output <path>', 'Report output file', 'output/mcp_server_report.md')
    .option('-s, --schemas', 'Include input schemas')
    .option('--no-schemas', 'Omit input schemas')
    .option('-m, --metadata', 'Include server identity, protocol and instructions')
    .option('--no-metadata', 'Omit server metadata')
    .option('-e, --examples', 'Include caller-supplied examples, when present')
    .option('--no-examples', 'Omit examples')
    .addOption(
      new Option('--protocol-era <era>', 'Handshake mode')
        .choices(['legacy', 'auto', '2026-07-28'])
        .default('legacy'),
    )
    .option('--max-pages <count>', 'Maximum pages per capability list', positiveInteger, 64)
    .option(
      '--timeout <ms>',
      'Connection and request timeout in milliseconds',
      positiveInteger,
      30000,
    )
    .option('-q, --quiet', 'Suppress progress output')
    .parse(argv);
  const options = program.opts<{
    config: string;
    output: string;
    schemas?: boolean;
    metadata?: boolean;
    examples?: boolean;
    protocolEra: ProtocolEraOption;
    maxPages: number;
    timeout: number;
    quiet?: boolean;
  }>();
  try {
    if (!options.quiet) ProgressReporter.initializeReporter();
    await new McpReporter(resolve(options.config), {
      outputPath: resolve(options.output),
      includeInputSchemas: options.schemas !== false,
      includeServerMetadata: options.metadata !== false,
      includeExamples: options.examples !== false,
      protocolEra: options.protocolEra,
      maxPages: options.maxPages,
      timeoutMs: options.timeout,
      progressCallback: options.quiet
        ? undefined
        : (event) => ProgressReporter.processProgressEvent(event),
    }).run();
  } catch (error) {
    ProgressReporter.stop();
    console.error(error instanceof Error ? error.message : 'mcp-reporter failed.');
    process.exitCode = 1;
  }
}
if (isEntryPoint(import.meta.url)) await runCli();
