/** src/version.ts — Package identity shared by the CLI and MCP handshake. */
import { readFileSync } from 'node:fs';
/** Published package version. */
export const VERSION: string = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;
