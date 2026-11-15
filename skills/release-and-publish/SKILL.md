---
name: release-and-publish
description: Ship a wrapped-up mcp-reporter release — final gates, fast-forward `main` from the release branch, create and check the annotated tag, push, publish to npm, and create the GitHub Release from the tag.
metadata:
  author: cyanheads
  version: "1.1"
  type: project-workflow
---

# Release and publish

Requires explicit publishing authorization and a completed `git-wrapup`: version and changelog synchronized, the release commit in the stack, a clean tree, and no `v<version>` tag yet. In release PR mode HEAD is on the pushed `release/<version>` with its PR open; a gated release also needs the caller's confirmation that the `release-pr-review` pass finished, and halts without it. Read `CLAUDE.md`. The destinations are npm and GitHub Releases only: no MCP Registry, MCPB, Docker, or hosting steps apply, and none get placeholder metadata.

## 1. Verify wrapup

Read the package version, branch, status, and stack. `git log -1 --format=%s` starts with `chore(release): <version>`; in gated mode the release commit may sit under the review pass's own commits, and anything else above it is a halt. Release PR mode: `gh pr view --json number,state,headRefOid` reports OPEN with `headRefOid` equal to `git rev-parse HEAD`. Keep the number and SHA; steps 3 to 5 need them after the checkout moves to `main`.

## 2. Run the gates

Run `bun run devcheck`, `bun run rebuild`, `bun run test:package`, and `bun audit`. Resolve failures and warnings; read any transitive advisory by its installed dependency path. Confirm the package allowlist excludes local configs, reports, tests, and credentials.

## 3. Fast-forward `main` (release PR mode)

```bash
git switch main
git merge --ff-only release/<version>
git rev-parse HEAD     # equals the PR's headRefOid
```

The stack lands on `main` with the same SHAs and signatures, and GitHub marks the PR merged once its head is on `main`. Never the GitHub merge button or `gh pr merge`: squash and rebase-merge rewrite the stack, and a merge commit breaks linear history. A refused fast-forward means `main` moved underneath the branch: halt and report, never rebase.

## 4. Create the annotated tag

Write the message to a file through a quoted heredoc and create the tag from it, never with `-m`:

```bash
cat > <scratch>/tag-v<version>.md <<'TAG'
<subject>

- <notable behavior> (#N)
- <one grouped line for smaller changes>

[CHANGELOG v<version>](https://github.com/cyanheads/mcp-reporter/blob/main/changelog/<major.minor>.x/<version>.md) · release PR #<N>
TAG
git tag -a v<version> --cleanup=whitespace -F <scratch>/tag-v<version>.md
```

`--cleanup=whitespace` keeps `#`-leading lines and leaves a signature git can parse; `verbatim` publishes the signature block into the release body.

- **Subject:** one short theme of about 60 characters, written fresh for the tag (the release commit's theme usually is it). No version, since GitHub prepends `v<version>:`, and no `;`.
- **Body, release PR mode:** the PR body's `## Changes` bullets and final changelog link verbatim (`gh pr view <N> --json body -q .body`), with ` · release PR #<N>` appended to the link line. The theme line and `## Gates` stay on the PR. Without a PR, author the same digest from the changelog entry; every claim must appear there.
- **Digest rules:** flat bullets with no Added/Changed/Fixed sections, narrative, or test counts. Every release concern appears at headline granularity, smaller ones in one grouped bullet. At most one dependency line. `(#N)` backlinks; an outside reporter is thanked as `(#N, thanks @user!)` on a bullet of its own. The changelog link is last, after a blank line.

Check it before anything is pushed:

```bash
git tag -l v<version> --format='%(if)%(contents:signature)%(then)signed%(else)unsigned%(end)'   # "signed" when tag signing is enabled
bun run release:github -- --check
```

A tag that fails either check is local and seconds old: delete and recreate it. An existing `v<version>` pointing at HEAD is a prior run's success; one pointing anywhere else is a halt with both SHAs.

## 5. Push

`git push origin main`, then `git push origin v<version>`. A rejection is a halt, never a force-push. Release PR mode: `gh pr view <N> --json state` must report `MERGED`; then `git push origin --delete release/<version>` and `git branch -d release/<version>`. A PR still OPEN or CLOSED means the pushed `main` lacks its head: stop before publishing.

## 6. Publish to npm

Run `bun publish --access public` and complete any interactive authentication the registry asks for. "Version already exists" is success only once `npm view mcp-reporter@<version> version` returns the version. Publish-time scanning can hold a new version back for minutes; wait in one bounded foreground call:

```bash
for i in $(seq 1 15); do curl -sf -m 15 -o /dev/null https://registry.npmjs.org/mcp-reporter/<version> && echo served && break; sleep 20; done
```

## 7. Create the GitHub Release

Run `bun run release:github`. It re-checks the tag, then runs `gh release create v<version> --verify-tag --notes-from-tag --title "v<version>: <subject>"`, and on "release already exists" repairs the title. The tag is pushed by now, so a check failure here is a halt to report, not a silent recreate.

## 8. Reconcile tracked work

Comment on addressed first-party issues with the release link, then close completed ones. Never close another contributor's issue without authorization. Incomplete or blocked work stays open with an accurate scope.

## 9. Report and verify

Retry transient network failures (`ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN`, HTTP 502/503/504, `integrity check failed`) at most twice, about 5 s then 15 s apart; never retry authentication or semantic failures. On a halt, report the failing step, its output, the retry count, and which destinations already have the release; a re-run skips them through the success signals above.

Verify `npm view mcp-reporter@<version> version` and `gh release view v<version> --json url,tagName,name,isDraft` against local metadata, then report the npm and GitHub Release URLs. A verification the sandbox blocks is reported as blocked, never routed around and never read as a failed publish; a push or publish exit code alone never counts as delivered.
