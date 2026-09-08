---
name: git-wrapup
description: Review verified mcp-reporter changes, prepare versioned changelog entries, create logical commits and an annotated local tag. No push or publish.
metadata:
  author: cyanheads
  version: "1.0"
  type: project-workflow
---

# Git wrapup

Run only with explicit commit/wrapup authorization. Read `CLAUDE.md` and the full diff first. This workflow stops at a local commit/tag; publishing belongs to `release-and-publish`.

## 1. Review the work

Read status, diff, recent history and the last tag. Include complete pre-existing changes when authorized, but do not overwrite or sweep another active writer's work. Never stash or use a worktree. If nothing changed, stop.

Confirm every reported fix exists, tests cover it, and relevant GitHub issues have current bodies. Review code, tests, docs, package files and generated output together. Do not publish reports from private server configurations.

## 2. Establish the version

Read `package.json` and use the user's release instruction. Apply semver to this CLI and library: patches fix compatible behavior, minors add compatible functionality, majors cover incompatible public APIs, module formats or runtime floors. Honor the release line in CLAUDE.md; do not promote this package to 2.x without user authorization. Within an authorized line, document consumer-incompatible changes with breaking frontmatter and upgrade instructions. Surface a genuinely undecided version before creating release artifacts. The SDK version is not this package's version.

## 3. Synchronize identity

Update `package.json`, the Bun lockfile and README version badge together. `src/version.ts` reads package metadata for both executable entry points and the MCP handshake; do not introduce another version literal. Check all current docs for stale versions; leave historical changelogs unchanged. Keep the npm name unscoped as `mcp-reporter`.

## 4. Write the changelog

Use `changelog/template.md` to create `changelog/<major.minor>.x/<version>.md` with `# <version> — YYYY-MM-DD`. No Unreleased header.

Required frontmatter: a quoted one-line `summary` of at most 350 characters, `breaking`, and `security`. Write the summary last from the body. Security is true for fixes in this package's source, not dependency-only advisories. Optional agent-notes contain upgrade actions only.

Use only populated sections in Added / Changed / Deprecated / Removed / Fixed / Security order, with Dependencies when relevant. Bullets state the symbol or behavior and its consumer consequence. Each dependency gets its own old → new version arrow. Link verified issue numbers with full URLs. Keep implementation walkthroughs in code and issues.

## 5. Regenerate artifacts

Run `bun run changelog:build` and `bun run tree`. Regenerate the synthetic example with `bun run example:report` if report behavior changed. Inspect each generated diff.

## 6. Verify

Run `bun run devcheck`, `bun run rebuild`, and `bun run test:package`. Tests are also available as `bun run test:all`. Every gate must pass with no warnings. Run `code-simplifier` for substantial source changes and `polish-docs-meta` for affected docs; exercise both CLI and programmatic entry points.

## 7. Commit by concern

Stage explicit paths. One cohesive concern per commit; a file's complete diff belongs to one commit. Never split a file with partial staging or temporary edits. Group work by actual scope, not a fixed commit count. Put version/changelog/derived release artifacts in the final release commit when separable; an inseparable package.json change stays whole.

Every commit has a conventional subject plus a one- or two-line body explaining why. Work subjects omit the release version. The release subject is `chore(release): <version> — <theme>`. No attribution trailers, marketing adjectives, or conversation references. Use ordinary issue references; closing keywords must not close issues before their resolution record exists.

Use shell-safe arguments or message files; never interpolate Markdown into a command string.

## 8. Create an annotated tag

Create `v<version>` with `--cleanup=whitespace`. If it exists, stop and report both the existing tag target and HEAD; never move it.

The annotation is a headline digest:

```text
<theme, without the version>

- <notable behavior> (#N)
- <another notable behavior> (#N)
- <one grouped line for smaller tooling/docs changes>
- deps: <one headline dependency arrow, only when it earns a line>

[CHANGELOG v<version>](https://github.com/cyanheads/mcp-reporter/blob/main/changelog/<major.minor>.x/<version>.md)
```

Use flat bullets, no Added/Changed/Fixed sections, narrative preamble, or gate/test-count footer. Every release concern appears at headline granularity; the changelog carries detail. The final link points to the actual version file. When signing is enabled, verify Git parses the signature before anything is pushed.

## 9. Verify local end state

Review the commit stack, tag annotation, tag target, and status. HEAD must match the intended tag and all intended work must be included. Report any intentionally excluded active work. Stop here without pushing or publishing.
