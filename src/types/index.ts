/** src/types/index.ts — Configuration, collected capabilities, and report options. */
import type {
  ServerCapabilities as AdvertisedCapabilities,
  Client,
  Implementation,
  Prompt,
  Resource,
  ResourceTemplateType,
  Tool,
  Transport,
} from '@modelcontextprotocol/client';

/** Local process configuration; existing command/args entries remain valid. */
export interface StdioServerConfig {
  type?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: never;
  headers?: never;
  disabled?: boolean;
  alwaysAllow?: string[];
}
/** Remote Streamable HTTP configuration. Header values are never rendered. */
export interface HttpServerConfig {
  type?: 'http';
  url: string;
  headers?: Record<string, string>;
  command?: never;
  args?: never;
  env?: never;
  cwd?: never;
  disabled?: boolean;
  alwaysAllow?: string[];
}
/** One configured server. */
export type McpServerConfig = StdioServerConfig | HttpServerConfig;
/** Configuration file envelope. */
export interface McpServersConfig {
  mcpServers: Record<string, McpServerConfig>;
}
/** Reportable tool definition, including optional caller-supplied examples. */
export type ToolInfo = Tool & { examples?: { in: unknown; out: unknown }[] };
/** Protocol definitions are retained without reducing their metadata. */
export type ResourceInfo = Resource;
export type ResourceTemplateInfo = ResourceTemplateType;
export type PromptInfo = Prompt;
/** Collected capability catalog. Prompts is optional for existing generator callers. */
export interface ServerCapabilities {
  tools: ToolInfo[];
  resources: ResourceInfo[];
  resourceTemplates: ResourceTemplateInfo[];
  prompts?: PromptInfo[];
}
/** Connection identity and transport configuration. */
export interface ServerInfo {
  id: string;
  name: string;
  config: McpServerConfig;
  client?: Client;
  connected: boolean;
  error?: string;
  connectionTime?: number;
  implementation?: Implementation;
  protocolVersion?: string;
  protocolEra?: 'legacy' | 'modern';
  advertisedCapabilities?: AdvertisedCapabilities;
  instructions?: string;
}
/** A list is either complete, not advertised, or incomplete with a safe diagnostic. */
export type CapabilityStatus =
  | { state: 'complete' }
  | { state: 'not-advertised' }
  | { state: 'incomplete'; error: string };
/** Full server report. */
export interface ServerReport extends ServerInfo {
  capabilities: ServerCapabilities;
  capabilityStatus?: Partial<Record<keyof ServerCapabilities, CapabilityStatus>>;
}
/** Progress event; errors contain safe diagnostics, never raw transport objects. */
export interface ProgressEvent {
  stage: 'init' | 'connecting' | 'fetching' | 'reporting' | 'complete' | 'error';
  serverId?: string;
  message: string;
  error?: Error;
}
/** Receives reporting lifecycle events. */
export type ProgressCallback = (event: ProgressEvent) => void;
/** CLI and programmatic protocol selection. */
export type ProtocolEraOption = 'legacy' | 'auto' | '2026-07-28';
/** Rendering, connection bounds, and optional injected transport for testing/embedding. */
export interface ReportOptions {
  outputPath: string;
  includeInputSchemas: boolean;
  includeServerMetadata: boolean;
  includeExamples: boolean;
  protocolEra?: ProtocolEraOption;
  maxPages?: number;
  timeoutMs?: number;
  progressCallback?: ProgressCallback;
  transportFactory?: (config: McpServerConfig, serverId: string) => Transport | Promise<Transport>;
}

/** Legacy parameter descriptor retained for typed consumers. */
export interface ToolParameter {
  name: string;
  description?: string;
  required?: boolean;
  schema?: unknown;
}
