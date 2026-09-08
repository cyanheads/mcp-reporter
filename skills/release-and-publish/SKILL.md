---
name: release-and-publish
description: Publish an approved, verified mcp-reporter release to npm and GitHub using the annotated tag digest.
metadata:
  author: cyanheads
  version: "1.0"
  type: project-workflow
---

# Release and publish

Requires explicit publishing authorization and a completed `git-wrapup`: synchronized version/changelog, reviewed commits, annotated `v<version>` at HEAD, and no unresolved working-tree changes. Read `CLAUDE.md`. This CLI targets npm and GitHub Releases; no MCP Registry, MCPB, Docker, or hosting steps apply.

## 1. Verify wrapup

Read package version, current branch, origin, tag target, annotation and status. Verify tag signing when configured; a signature block must never be interpreted as release text. An existing tag conflict is a stop, not permission to replace it.

## 2. Run the gates

Run `bun run devcheck`, `bun run rebuild`, `bun run test:package`, and `bun audit`. Inspect output and resolve failures/warnings. Confirm the package allowlist excludes local configs, reports, tests, backups and credentials. Review any transitive advisory by its actual installed dependency path.

## 3. Push the reviewed commits and exact tag

Push the intended branch, then the exact release tag. Do not push unrelated tags. A rejection requires reconciliation, never force-push or stash. A PR route does not authorize merging.

## 4. Publish npm

Run `bun publish --access public`. Verify the name is still `mcp-reporter`. Complete configured interactive authentication when requested by the registry. An already-published version is successful only after querying and verifying that exact package/version; never treat arbitrary publish errors as success.

## 5. Record skipped server destinations

There is no `server.json`, MCP Registry registration, MCPB bundle or container deployment for this client. Do not create placeholder metadata or destinations to satisfy a server workflow.

## 6. Create the GitHub Release

Run `bun run release:github`. It uses the annotated tag and creates the title `v<VERSION>: <tag subject>` with `--verify-tag --notes-from-tag`. The annotation's subject omits the version and its flat digest ends in a per-version changelog link. Existing-release recovery updates the title; inspect the existing body before replacing any published content.

## 7. Reconcile tracked work

After verifying delivery, add concise resolution comments on addressed first-party issues with release/commit links, then close completed issues. Do not close another contributor's issue without authorization. Keep incomplete or blocked work open with accurate scope.

## 8. Report artifacts and partial failures

Return the npm version URL and GitHub Release URL. On a failure, state which destinations succeeded and the exact failing step. Retry transient network errors at most twice with brief backoff; do not retry authentication, integrity or semantic failures blindly.

## 9. Verify reachability

Query the exact npm version and `gh release view v<version> --json url,tagName,name,isDraft`. Check the title and tag against local metadata. Distinguish a blocked verification from evidence that publication failed. Never report a release as complete based only on a push exit code.
