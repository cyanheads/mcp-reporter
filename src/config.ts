/** src/config.ts — Validate server configuration without echoing credential values. */
import { z } from 'zod';
import type { McpServersConfig } from './types/index.js';

const common = { disabled: z.boolean().optional(), alwaysAllow: z.array(z.string()).optional() };
const strings = z.record(z.string(), z.string());
const stdio = z.object({
  ...common,
  type: z.literal('stdio').optional(),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: strings.optional(),
  cwd: z.string().optional(),
  url: z.never().optional(),
  headers: z.never().optional(),
});
const http = z.object({
  ...common,
  type: z.literal('http').optional(),
  url: z.url({ protocol: /^https?$/ }),
  headers: strings.optional(),
  command: z.never().optional(),
  args: z.never().optional(),
  env: z.never().optional(),
  cwd: z.never().optional(),
});
const serverConfig = z.union([stdio, http]);
const envelope = z.object({
  mcpServers: z.custom<Record<string, unknown>>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
});
/** Parse the whole file before connecting to any server. */
export function parseConfig(value: unknown): McpServersConfig {
  const root = envelope.safeParse(value);
  if (!root.success) throw new Error('Configuration must contain a mcpServers object.');
  const mcpServers: McpServersConfig['mcpServers'] = {};
  for (const [id, entry] of Object.entries(root.data.mcpServers)) {
    const parsed = serverConfig.safeParse(entry);
    if (!parsed.success)
      throw new Error(
        `Invalid configuration for server ${JSON.stringify(id)}: supply either command with optional args/env/cwd, or an HTTP(S) url with optional headers; type must match the transport.`,
      );
    Object.defineProperty(mcpServers, id, { value: parsed.data, enumerable: true });
  }
  return { mcpServers };
}
