---
name: field-test
description: Exercise mcp-reporter's collected reports through in-memory, stdio, HTTP and compiled Node entry points.
metadata:
  author: cyanheads
  version: "1.0"
  type: project-workflow
---

# Field test

Read `CLAUDE.md`, source and the full diff. Build the target list from every changed behavior, including complete pre-existing changes. Test the local build, not a globally installed or remote published version.

Run `bun run devcheck`, `bun run rebuild`, and `bun run test:package`. Tests use known synthetic fixtures; do not execute the user's local server config or start unrelated services.

Verify applicable boundaries:

- All four capability classes, full optional descriptor metadata, server identity/instructions and negotiated protocol version.
- Legacy default without discovery, auto fallback, pinned modern success/failure, and both stdio/Streamable HTTP.
- Later pages, empty pages with cursors, empty-string cursors, repeated cursors, limits and later-page errors. Counts must disclose incompleteness.
- Unadvertised, successful empty, malformed and failed lists. One server/list failure must not discard successful neighbors.
- Config shape validation, disabled entries, transport conflicts and static headers.
- Credential sentinels in env/args/headers/URLs and nested errors; none may reach diagnostics, callbacks or reports through configuration/error handling.
- Rendering flags independently and together, supplied examples, zero connection duration, delimiter escaping and code-fence balance.
- Startup failure, timeout, report-write failure and transport cleanup; no stranded processes or timers.
- Compiled Node CLI help/version/options and programmatic import, with actual package contents inspected.

For new bugs, observe a failing regression before fixing. For existing untested behavior, pin a passing characterization before editing. Use additional live targets only when the user explicitly requests them. Report commands and concrete outcomes, not inferred success.
