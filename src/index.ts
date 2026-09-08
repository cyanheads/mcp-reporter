/** src/index.ts — Connect to MCP servers and collect complete capability reports. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Transport } from '@modelcontextprotocol/client';
import {
  Client,
  InsufficientScopeError,
  ProtocolError,
  SdkError,
  SdkHttpError,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { parseConfig } from './config.js';
import { isEntryPoint } from './is-entry-point.js';
import type {
  ProgressEvent,
  ReportOptions,
  ServerCapabilities,
  ServerInfo,
  ServerReport,
} from './types/index.js';
import { MarkdownGenerator } from './utils/markdown.js';
import { VERSION } from './version.js';

export type * from './types/index.js';
export { MarkdownGenerator };

const DEFAULT_OPTIONS = {
  outputPath: './output/mcp_server_report.md',
  includeInputSchemas: true,
  includeServerMetadata: true,
  includeExamples: true,
  protocolEra: 'legacy',
  maxPages: 64,
  timeoutMs: 30000,
} satisfies ReportOptions;

/** Error text from a peer or child can contain credentials; expose only stable classifications. */
function diagnostic(error: unknown): string {
  if (error instanceof InsufficientScopeError)
    return 'Authorization failed: the configured credentials lack the required scope.';
  if (error instanceof UnauthorizedError)
    return 'Authorization required; check the configured credentials.';
  if (error instanceof SdkHttpError)
    return `HTTP ${error.status} (${error.code}); check endpoint access and configured authorization.`;
  if (error instanceof ProtocolError) return `MCP request failed (JSON-RPC ${error.code}).`;
  if (error instanceof SdkError) return `MCP connection or request failed (${error.code}).`;
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
    return 'Executable not found; check the configured command and PATH.';
  return 'Connection or request failed; check the server configuration and availability.';
}

/** Collect server definitions without invoking tools, reading resources, or rendering prompts. */
export class McpReporter {
  private readonly options;
  private servers: ServerInfo[] = [];
  constructor(
    private readonly configPath: string,
    options: Partial<ReportOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    if (!Number.isSafeInteger(this.options.maxPages) || this.options.maxPages < 1)
      throw new Error('maxPages must be a positive integer.');
    if (!Number.isSafeInteger(this.options.timeoutMs) || this.options.timeoutMs < 1)
      throw new Error('timeoutMs must be a positive integer.');
    if (!['legacy', 'auto', '2026-07-28'].includes(this.options.protocolEra))
      throw new Error('protocolEra must be legacy, auto, or 2026-07-28.');
  }
  private progress(event: ProgressEvent): void {
    this.options.progressCallback?.(event);
  }
  /** Validate configuration and skip explicitly disabled servers. */
  public async readConfig(): Promise<void> {
    let value: unknown;
    const text = await readFile(this.configPath, 'utf8');
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('Configuration is not valid JSON.');
    }
    this.servers = Object.entries(parseConfig(value).mcpServers)
      .filter(([, config]) => !config.disabled)
      .map(([id, config]) => ({ id, name: id, config, connected: false }));
    this.progress({ stage: 'init', message: `Found ${this.servers.length} enabled MCP servers` });
  }
  private async connect(server: ServerInfo): Promise<void> {
    let transport: Transport | undefined;
    const mode = this.options.protocolEra;
    const client = new Client(
      { name: 'mcp-reporter', version: VERSION },
      {
        capabilities: {},
        ...(mode === 'legacy'
          ? {}
          : { versionNegotiation: { mode: mode === 'auto' ? 'auto' : { pin: mode } } }),
      },
    );
    server.client = client;
    this.progress({
      stage: 'connecting',
      serverId: server.id,
      message: `Connecting to ${server.id}`,
    });
    const start = performance.now();
    try {
      const config = server.config;
      transport = this.options.transportFactory
        ? await this.options.transportFactory(config, server.id)
        : config.url !== undefined
          ? new StreamableHTTPClientTransport(new URL(config.url), {
              requestInit: { headers: config.headers, redirect: 'error' },
            })
          : new StdioClientTransport({
              command: config.command,
              args: config.args,
              env: config.env,
              cwd: config.cwd,
              stderr: 'ignore',
            });
      await client.connect(transport, { timeout: this.options.timeoutMs });
      server.connected = true;
      server.connectionTime = Math.round(performance.now() - start);
      server.implementation = client.getServerVersion();
      server.protocolVersion = client.getNegotiatedProtocolVersion();
      server.protocolEra = client.getProtocolEra();
      server.advertisedCapabilities = client.getServerCapabilities();
      server.instructions = client.getInstructions();
    } catch (error) {
      server.error = diagnostic(error);
      this.progress({ stage: 'error', serverId: server.id, message: server.error });
      await transport?.close().catch((error) => {
        this.progress({
          stage: 'error',
          serverId: server.id,
          message: `Transport cleanup failed: ${diagnostic(error)}`,
        });
      });
    }
  }
  private async collect(server: ServerInfo): Promise<ServerReport> {
    const capabilities: Required<ServerCapabilities> = {
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    };
    const capabilityStatus: NonNullable<ServerReport['capabilityStatus']> = {};
    const report: ServerReport = { ...server, capabilities, capabilityStatus };
    if (!server.connected || !server.client) return report;
    const client = server.client;
    const requests = {
      tools: async (cursor?: string) => {
        const page = await client.request(
          { method: 'tools/list', params: cursor === undefined ? {} : { cursor } },
          { timeout: this.options.timeoutMs },
        );
        capabilities.tools.push(...page.tools);
        return page.nextCursor;
      },
      resources: async (cursor?: string) => {
        const page = await client.request(
          { method: 'resources/list', params: cursor === undefined ? {} : { cursor } },
          { timeout: this.options.timeoutMs },
        );
        capabilities.resources.push(...page.resources);
        return page.nextCursor;
      },
      resourceTemplates: async (cursor?: string) => {
        const page = await client.request(
          { method: 'resources/templates/list', params: cursor === undefined ? {} : { cursor } },
          { timeout: this.options.timeoutMs },
        );
        capabilities.resourceTemplates.push(...page.resourceTemplates);
        return page.nextCursor;
      },
      prompts: async (cursor?: string) => {
        const page = await client.request(
          { method: 'prompts/list', params: cursor === undefined ? {} : { cursor } },
          { timeout: this.options.timeoutMs },
        );
        capabilities.prompts.push(...page.prompts);
        return page.nextCursor;
      },
    };
    for (const key of ['tools', 'resources', 'resourceTemplates', 'prompts'] as const) {
      const advertised = key === 'resourceTemplates' ? 'resources' : key;
      if (!server.advertisedCapabilities?.[advertised]) {
        capabilityStatus[key] = { state: 'not-advertised' };
        continue;
      }
      this.progress({
        stage: 'fetching',
        serverId: server.id,
        message: `Fetching ${key} from ${server.id}`,
      });
      let cursor: string | undefined;
      const seen = new Set<string>();
      try {
        for (let pageNumber = 0; ; pageNumber++) {
          if (pageNumber === this.options.maxPages) {
            capabilityStatus[key] = {
              state: 'incomplete',
              error: `Page limit reached (${this.options.maxPages}); collected entries are partial.`,
            };
            break;
          }
          cursor = await requests[key](cursor);
          if (cursor === undefined) {
            capabilityStatus[key] = { state: 'complete' };
            break;
          }
          if (seen.has(cursor)) {
            capabilityStatus[key] = {
              state: 'incomplete',
              error: 'Repeated pagination cursor; collected entries are partial.',
            };
            break;
          }
          seen.add(cursor);
        }
      } catch (error) {
        capabilityStatus[key] = { state: 'incomplete', error: diagnostic(error) };
      }
    }
    return report;
  }
  /** Run a fresh collection; always close clients, including after report write failures. */
  public async run(): Promise<void> {
    const reports: ServerReport[] = [];
    try {
      await this.readConfig();
      for (const server of this.servers) {
        await this.connect(server);
        reports.push(await this.collect(server));
      }
      const markdown = MarkdownGenerator.generateReport(reports, this.options);
      await mkdir(dirname(this.options.outputPath), { recursive: true });
      await writeFile(this.options.outputPath, markdown, 'utf8');
      this.progress({ stage: 'complete', message: 'MCP server capability reporting complete' });
    } finally {
      for (const server of this.servers) {
        try {
          await server.client?.close();
        } catch (error) {
          this.progress({ stage: 'error', serverId: server.id, message: diagnostic(error) });
        }
      }
    }
  }
}
/** Default executable entry point, retained for direct invocation. */
export async function main(): Promise<void> {
  const { runCli } = await import('./cli.js');
  await runCli();
}
if (isEntryPoint(import.meta.url)) {
  main().catch(() => {
    console.error('mcp-reporter failed.');
    process.exitCode = 1;
  });
}
