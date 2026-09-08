# Upgrading to 1.1.0

Version 1.1.0 uses the split MCP SDK client package and ESM. Node.js 22.12 or newer is required by the dependency set. Use `import`, including from CommonJS via `await import('mcp-reporter')`; Node.js is the runtime for compiled output, and Bun runs development scripts.

Existing stdio entries and positive CLI flags remain valid. `args` is optional; HTTP entries use `url` and optional static `headers`. Configuration is validated before any connection starts. The default remains the legacy handshake; select `auto` or `2026-07-28` when modern discovery is needed.

`includeInputSchemas`, `includeServerMetadata`, and `includeExamples` now affect rendering. Negative CLI flags switch them off. Output schemas remain visible when input schemas are hidden. Examples are retained for renderer callers but are not fetched or synthesized from MCP.

Programmatic runs no longer print a CLI header automatically. Supply a `progressCallback` for progress. The CLI writes progress to stderr. Connection errors contain stable classifications instead of raw peer/transport messages, and reports omit raw launch args, configured credentials, and HTTP URL paths/query/userinfo.

Reports use Markdown tables and explicit not-advertised/complete/incomplete states. Tool/resource/prompt descriptors retain their metadata. Consumers parsing the old CSS-dependent Markdown must update their parsing; the report is a human-readable artifact, not a versioned JSON interchange format.

Development now uses `bun.lock`, `bun run devcheck`, `bun run rebuild`, and `bun run test:package`. Publishing is local through the project release skills, with per-version changelog files and annotated tag digests.

## Dependency changes

| Package | Change |
| --- | --- |
| `@modelcontextprotocol/sdk` | `^1.7.0` → `@modelcontextprotocol/client ^2.0.0` |
| `chalk` | `^5.4.1` → `^6.0.0` |
| `commander` | `^13.1.0` → `^15.0.0` |
| `ora` | `^8.2.0` → `^9.4.1` |
| `typescript` | `^5.8.2` → `^7.0.2` (development only) |
| `@types/node` | `^22.13.10` → `^26.5.0` (development only) |
| `zod` | Added `^4.5.4` for config validation |
| `@modelcontextprotocol/server` | Added `^2.0.0` for test fixtures only |
| `@types/bun` | Added `^1.4.2` for tests and scripts |
| `@biomejs/biome` | Added `^2.5.12` for the local lint/format gate |
| `ignore` | Added `^7.0.9` for the directory-map script |
| `fast-glob` | Removed unused `^3.3.2` dependency |
| `fs-extra` | Removed unused `^11.2.0` dependency |
| `nodemon` | Removed unused `^3.1.9` dependency |
| `rimraf` | Removed unused `^6.0.1` dependency |
| `ts-node` | Removed `^10.9.2`; Bun runs development TypeScript |

## Design decisions

- Collect typed pages directly: the SDK's high-level helpers can filter advertised tools or hide repeated-cursor termination; a report needs faithful advertisements and explicit incompleteness.
- Keep legacy as the default: automatic discovery can add a stdio subprocess and probe timeout to every report run.
- Keep CLI workflows local: npm packaging and GitHub Releases apply to this project; server registries, MCPB bundles and container deployment do not.
