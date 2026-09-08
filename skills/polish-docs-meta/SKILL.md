---
name: polish-docs-meta
description: Reconcile mcp-reporter's README, package identity, example reports, project guidance and release metadata against verified behavior.
metadata:
  author: cyanheads
  version: "1.0"
  type: project-workflow
---

# Polish docs and metadata

Read `CLAUDE.md`, README, package.json, the diff, and every affected document in full. Keep the machine/package name `mcp-reporter`, unscoped, on every install surface. Use a compact centered identity/badge/navigation block followed by concrete setup and usage.

Check installation commands against the package contents and runtime floor; derive help/defaults from the actual CLI. Cover stdio and HTTP config, static authorization, protocol selection, report states, flags, library usage and development gates. Distinguish advertised hints from verified behavior and incomplete counts from totals. Explain intentional limitations without marketing claims.

Regenerate `docs/example-report.md` from synthetic fixtures and `docs/tree.md` from the script. Never publish a private configuration or operational report as an example. Make relative README links usable from GitHub and keep generated files synchronized.

Verify package version, README badge, shared VERSION, changelog date/frontmatter/index, skill paths and script names. Release descriptions follow `git-wrapup`; avoid duplicating a changelog as a tag body.

Cold-read all substantial prose as a new user. Remove inflated claims, repeated framing, filler, gratuitous headings and unexplained jargon. Preserve exact API names and hard constraints. Run the local gates and package smoke test after docs/config changes that affect behavior or package contents. This workflow does not commit or publish.
