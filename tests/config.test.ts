/** tests/config.test.ts — Configuration rejects ambiguous transports before I/O. */
import { expect, test } from 'bun:test';
import { parseConfig } from '../src/config.js';
import { McpReporter } from '../src/index.js';

test('stdio and HTTP coexist with inferred or explicit transport types', () => {
  const parsed = parseConfig({
    mcpServers: {
      local: { command: 'node' },
      remote: { url: 'https://example.com/mcp' },
      explicit: {
        type: 'http',
        url: 'http://localhost:3000/mcp',
        headers: { Authorization: 'Bearer sentinel' },
      },
    },
  });
  expect(Object.keys(parsed.mcpServers)).toEqual(['local', 'remote', 'explicit']);
});
for (const config of [
  {},
  { command: 'node', url: 'https://example.com' },
  { command: 'node', type: 'http' },
  { url: 'https://example.com', type: 'stdio' },
  { url: 'file:///secret' },
  { command: 12 },
  { command: 'node', args: 'sentinel' },
  { url: 'https://example.com', headers: { Authorization: 12 } },
  { command: 'node', env: { KEY: 12 } },
]) {
  test(`invalid configuration rejects safely: ${JSON.stringify(config)}`, () => {
    expect(() => parseConfig({ mcpServers: { invalid: config } })).toThrow(
      'Invalid configuration for server "invalid"',
    );
  });
}
test('invalid envelope and connection bounds reject before connecting', () => {
  for (const value of [null, [], {}, { mcpServers: [] }])
    expect(() => parseConfig(value)).toThrow('mcpServers');
  for (const value of [0, -1, 1.5, NaN, Infinity]) {
    expect(() => new McpReporter('unused', { maxPages: value })).toThrow('maxPages');
    expect(() => new McpReporter('unused', { timeoutMs: value })).toThrow('timeoutMs');
  }
});
test('prototype-shaped IDs are ordinary server entries', () => {
  const parsed = parseConfig(JSON.parse('{"mcpServers":{"__proto__":{"command":"node"}}}'));
  expect(Object.keys(parsed.mcpServers)).toEqual(['__proto__']);
  expect(Object.getPrototypeOf(parsed.mcpServers)).toBe(Object.prototype);
});
