# Contributing

Hi, and thanks for using `mcp-reporter`! If you've hit a bug or want something it doesn't do yet, an issue is the most useful thing you can send. Let me know about any rough edge or new ideas.

Issues are the contribution path here: bugs, feature requests, and documentation gaps all land there, and code changes go through my workflows, so a precise issue with a reproduction is the fastest route to a fix.

- [Report a bug](https://github.com/cyanheads/mcp-reporter/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/cyanheads/mcp-reporter/issues/new?template=feature_request.yml)
- [Float an idea or ask a question](https://github.com/cyanheads/mcp-reporter/issues/new) — free-form, no template, no need to be sure it's a bug first

The bug and feature forms are structured, and filling in the fields is what makes those actionable. Anything that fits neither can just be a plain issue — a half-formed idea in your own words is fine.

## Before filing

A few things that save a round-trip:

1. **Confirm it's the reporter, not the server.** A missing tool, a bare description, or an odd schema in the report usually came off the wire that way. Check the server's own `tools/list` output first; if the server advertises it and the report drops it, that's a bug here.
2. **Check you're on the latest release.** `npm view mcp-reporter version` — fixes land on the current version, older ones aren't patched.
3. **Search existing issues.** `gh issue list -R cyanheads/mcp-reporter --search "<keyword>" --state all`. Add to the matching thread instead of opening a duplicate.
4. **Redact anything sensitive.** Issues are public and permanent, and server configs hold real API keys — replace every `env` value, auth header, and internal URL with `REDACTED` before pasting a config, log, or stack trace.

## What makes an issue actionable

- mcp-reporter version, Node.js version, and whether you ran the CLI or the `McpReporter` class.
- The `mcpServers` entry that reproduces it, redacted.
- Actual vs expected behavior, verbatim: console output, error messages, and the offending section of the generated report as they appeared.
- For features: the use case first, then the config key, CLI flag, or report section as you'd want to use it.

## Security

Don't open a public issue for a vulnerability. See [SECURITY.md](./SECURITY.md) for private disclosure.
