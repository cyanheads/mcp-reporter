<div align="center">
  <h1>mcp-reporter</h1>
  <p><b>See what your MCP servers advertise.</b></p>
  <p>Generate a Markdown catalog of tools, resources, prompts, schemas, and server metadata.</p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.1.1-blue.svg?style=flat-square)](./CHANGELOG.md) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.12.0-339933.svg?style=flat-square)](https://nodejs.org/) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-2.0.0-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/typescript-sdk)

[Quick start](#quick-start) · [Configuration](#configuration) · [Report contents](#report-contents) · [Library](#use-as-a-library) · [Development](#development)

</div>

---

`mcp-reporter` connects to local stdio processes and remote Streamable HTTP endpoints, reads their advertised capabilities, and writes a report you can keep alongside project documentation or pass to another tool.

It enumerates tools, resources, resource templates, and prompts. It does not execute tools, read resource contents, or expand prompts. [View a synthetic example report.](docs/example-report.md)

## Quick start

Requires **Node.js 22.12 or newer**. Development uses **Bun 1.4 or newer**.

Create `mcp-servers.json` with a server you already run:

```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["/absolute/path/to/server/dist/index.js"]
    }
  }
}
```

Generate a report:

```bash
npx mcp-reporter --config mcp-servers.json --output output/report.md
```

## Configuration

The configuration is a JSON object containing `mcpServers`. Each key identifies a server in the report. Local and remote entries can share one file:

```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["/absolute/path/to/server/dist/index.js"],
      "env": { "EXAMPLE_API_KEY": "REPLACE_WITH_YOUR_KEY" }
    },
    "remote-server": {
      "type": "http",
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer REPLACE_WITH_YOUR_TOKEN" }
    },
    "disabled-server": {
      "command": "node",
      "args": ["/absolute/path/to/another/server.js"],
      "disabled": true
    }
  }
}
```

| Field | Applies to | Meaning |
| --- | --- | --- |
| `command` | stdio | Executable to spawn |
| `args` | stdio | Optional argument array |
| `env` | stdio | Optional string-valued environment entries, passed to the SDK transport |
| `cwd` | stdio | Optional working directory for the child process |
| `url` | HTTP | Streamable HTTP endpoint, including its MCP path |
| `headers` | HTTP | Optional static request headers |
| `type` | Either | Optional `stdio` or `http`; must agree with the entry |
| `disabled` | Either | Skip the entry when `true` |
| `alwaysAllow` | Either | Accepted for config compatibility; no tools are invoked |

Supply exactly one of `command` or `url`. The reporter validates the entire file before connecting. Paths are resolved from the process working directory; use absolute paths when sharing a configuration between callers. Interactive OAuth and legacy SSE endpoints are not supported.

Configuration values can contain credentials. The reporter omits env/header values, raw command arguments, and URL paths/query/userinfo from its diagnostics and launch metadata. Child stderr is suppressed; failures use safe error categories. Server-provided descriptions, schemas, instructions, and extension metadata are retained as report content, so review those before sharing a report.

## Choose a protocol mode

Legacy negotiation is the default, preserving compatibility with servers that expect `initialize`.

| `--protocol-era` | Behavior |
| --- | --- |
| `legacy` | Use the legacy handshake without a discovery probe |
| `auto` | Discover modern support, falling back on legacy evidence |
| `2026-07-28` | Require that modern revision; no legacy fallback |

```bash
npx mcp-reporter --config mcp-servers.json --protocol-era auto
```

Auto mode can start an extra short-lived stdio process and wait for a probe timeout before using the legacy handshake. HTTP authorization failures and timeouts are reported as failures, not evidence of legacy support. The report records the actual selected protocol version and era.

## Report contents

| Section | Included information |
| --- | --- |
| Executive summary | Connection counts and collected capability counts |
| Connection failures | Configured server ID and safe failure reason |
| Server information | Transport, implementation identity, negotiated protocol, connection time, advertised flags, instructions |
| Tools | Names, titles, descriptions, input/output schemas, annotations, icons and extension metadata |
| Resources and templates | URIs/templates, names, descriptions, MIME types and supplied metadata |
| Prompts | Names, descriptions, arguments, required flags and supplied metadata |

Lists are collected page by page. Each capability is reported as **not advertised**, **complete** (possibly empty), or **incomplete**. Page limits, repeated cursors and request failures keep collected entries and mark their counts as partial. A failed server or list does not discard successful neighbors.

Tables and text carry the report; collapsible details hold longer definitions. Icons remain metadata rather than remote image loads. Server annotations are hints supplied by the server, not independently verified safety guarantees. Enumeration retains advertisements even when a client might refuse to call a tool with an invalid schema extension.

## CLI options

| Option | Default | Purpose |
| --- | --- | --- |
| `-c, --config <path>` | `mcp-servers.json` | Configuration file |
| `-o, --output <path>` | `output/mcp_server_report.md` | Markdown destination |
| `--no-schemas` | Schemas included | Hide input schemas; output schemas remain visible |
| `--no-metadata` | Metadata included | Hide server information, advertised flags and instructions |
| `--no-examples` | Examples included | Hide caller-supplied examples |
| `--protocol-era <era>` | `legacy` | `legacy`, `auto`, or `2026-07-28` |
| `--max-pages <count>` | `64` | Positive page bound for each capability list |
| `--timeout <ms>` | `30000` | Positive connection/request timeout |
| `-q, --quiet` | Off | Suppress progress; fatal errors still go to stderr |
| `-V, --version` | — | Print package version |
| `-h, --help` | — | Print help |

For HTTP servers, the timeout bounds the entire handshake, including the initialized notification response. A timeout closes the transport, records a connection failure, and allows the remaining servers to be reported. Each capability-list request retains its own timeout.

Existing positive flags `-s/--schemas`, `-m/--metadata`, and `-e/--examples` remain accepted. MCP enumeration has no examples source; examples appear only when a programmatic caller supplies them to the renderer.

Progress goes to stderr, and the report is written to the selected file. Exit code `0` means the report was written, including any recorded connection/list failures. Invalid configuration or a report-write failure exits `1`.

## Use as a library

```bash
bun add mcp-reporter
```

```ts
import { McpReporter } from 'mcp-reporter';

const reporter = new McpReporter('./mcp-servers.json', {
  outputPath: './output/capabilities.md',
  protocolEra: 'auto',
  includeInputSchemas: true,
  includeServerMetadata: true,
  maxPages: 64,
  timeoutMs: 30_000,
  progressCallback(event) {
    console.error(event.message);
  },
});

await reporter.run();
```

The library is ESM and stays quiet without a progress callback. `run()` resolves after writing the report and closing connections; it rejects configuration/file errors. A second run starts a fresh collection. `ReportOptions.transportFactory(config, serverId)` can supply a transport for embedding or deterministic tests.

Types are exported from the package root. To render an already collected `ServerReport[]`, import `MarkdownGenerator` from `mcp-reporter` and call `generateReport(reports, options)`. It honors the same rendering flags and preserves optional `ToolInfo.examples` supplied by the caller.

See [upgrading to 1.1.0](docs/upgrading.md) for runtime, module, and reporting changes.

## Development

Build a source checkout:

```bash
git clone https://github.com/cyanheads/mcp-reporter.git
cd mcp-reporter
bun install
bun run rebuild
```

Run the built CLI with `node dist/cli.js --config mcp-servers.json`.

| Command | Purpose |
| --- | --- |
| `bun run devcheck` | Lint, source/script/test typechecks, changelog check, full test suite |
| `bun run rebuild` | Clean and compile the Node package |
| `bun run test:all` | Run deterministic behavior tests |
| `bun run test:package` | Verify compiled Node CLI/library and package contents |
| `bun run format` | Apply Biome formatting and safe fixes |
| `bun run example:report` | Regenerate the synthetic example report |
| `bun run tree` | Regenerate the [directory map](docs/tree.md) |
| `bun run list-skills` | List [project workflows](skills/README.md) |

Tests use in-memory SDK servers, loopback HTTP and synthetic stdio processes. They need no credentials or external MCP servers. Release workflows use local gates, per-version changelogs, conventional commits and annotated tag digests; npm and GitHub are the publication targets.

[Contributing](.github/CONTRIBUTING.md) · [Security](.github/SECURITY.md) · [Changelog](CHANGELOG.md) · [Apache-2.0 license](LICENSE)

<div align="center">

Built by [Casey Hand](https://caseyjhand.com) · [Support the project](https://github.com/sponsors/cyanheads)

</div>
