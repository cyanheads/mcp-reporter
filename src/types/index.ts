/**
 * MCP Server Reporter Types
 * Types for the MCP server capability reporting system
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/** MCP Server configuration from the JSON file */
export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
}

/** Full MCP server configuration object */
export interface McpServersConfig {
  mcpServers: Record<string, McpServerConfig>;
}

/** Processed server information */
export interface ServerInfo {
  id: string;
  name: string;
  config: McpServerConfig;
  client?: Client;
  connected: boolean;
  error?: string;
}

/** Tool parameter information */
export interface ToolParameter {
  name: string;
  description?: string;
  required?: boolean;
  schema?: any;
}

/** Tool information */
export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: any;
  examples?: { in: any; out: any }[];
}

/** Resource information */
export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** Resource template information */
export interface ResourceTemplateInfo {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** Collected server capabilities */
export interface ServerCapabilities {
  tools: ToolInfo[];
  resources: ResourceInfo[];
  resourceTemplates: ResourceTemplateInfo[];
}

/** Full server report information */
export interface ServerReport extends ServerInfo {
  capabilities: ServerCapabilities;
  connectionTime?: number; // in milliseconds
}

/** Reporter progress event */
export interface ProgressEvent {
  stage: 'init' | 'connecting' | 'fetching' | 'reporting' | 'complete' | 'error';
  serverId?: string;
  message: string;
  error?: Error;
}

/** Reporter progress callback */
export type ProgressCallback = (event: ProgressEvent) => void;

/** Report generation options */
export interface ReportOptions {
  outputPath: string;
  includeInputSchemas: boolean;
  includeServerMetadata: boolean;
  includeExamples: boolean;
  progressCallback?: ProgressCallback;
}