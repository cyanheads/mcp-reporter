---
name: git-wrapup
description: Land verified mcp-reporter changes as a stack of logical commits topped by a release commit — in release PR mode on `release/<version>`, pushed, with the PR open. No tag, no push to `main`, no publish; `release-and-publish` merges, tags, and ships.
metadata:
  author: cyanheads
  version: "1.1"
  type: project-workflow
---

# Git wrapup

Run only with explicit commit or wrapup authorization. Read `CLAUDE.md` and the full diff first. Committing means releasing: the work is complete, `code-simplifier` has run over substantial source changes, and `bun run devcheck` (exit 0, zero warnings), `bun run rebuild`, and `bun run test:package` passed on the finished tree before this starts. A red gate is fixed first.

## Release PR mode

`CLAUDE.md` § Publishing declares the mode; a caller's brief may override it for one release.

| Mode | Wrapup ends at | Then |
| --- | --- | --- |
| none | stack on `main`, tree clean | `release-and-publish` tags HEAD and ships |
| gated | stack on `release/<version>`, branch pushed, PR open | `release-pr-review` on the PR, then a separate `release-and-publish` run |
| straight-through | same as gated | the same agent continues into `release-and-publish` |

The commit stack, release commit, and tag format are identical in every mode.

## 1. Review the work

```bash
git branch --show-current                 # empty = detached HEAD: halt
git status
git log v<latest-tag>..HEAD --oneline
git diff HEAD                             # staged and unstaged; plain `git diff` hides staged work
git ls-files --others --exclude-standard  # new files never appear in the diff
```

Read every untracked file in full; staged changes ship like the rest. A complete change idle for hours folds in as its own commit. A change this run did not make that was modified in the last few minutes, or is visibly half done, stays uncommitted and is reported. Never stash or use a worktree. A clean tree with no commits since the last tag: stop.

Confirm every reported fix exists and has a test, addressed GitHub issues carry current bodies, and nothing generated from a private server configuration ships.

## 2. Establish the version and the branch

A version pinned in the brief is binding. Otherwise apply semver to this CLI and library: patches fix compatible behavior, minors add compatible functionality, majors cover incompatible public APIs, module formats, or runtime floors. Releases stay in the 1.x line unless the user changes that; within it, consumer-incompatible changes carry `breaking: true` and upgrade instructions. Surface a genuinely undecided version instead of picking one. The SDK version is not this package's version.

In release PR mode, create the branch now, before any commit:

```bash
git ls-remote --heads origin release/<version>    # must print nothing
gh pr list --head release/<version> --state all   # must print nothing
git branch --no-merged main --list 'release/*'    # must print nothing
git switch -c release/<version>                   # from main; uncommitted work rides along
```

A remote branch or PR for this version means an abandoned run claimed it, and an unmerged local `release/*` branch means a prior release never landed: halt and report. A `release/*` branch already merged into `main` is a leftover; delete it with `git branch -d`. Commits accidentally made on an unpushed `main` stay where they are: branch at HEAD and continue, never reset or move a ref.

## 3. Commit the work by concern

In release PR mode, `git branch --show-current` prints `release/<version>` before every commit. Work lands before the version bump, so a file a work concern shares with the version (`package.json` in a dependency refresh) ships whole in that concern's commit and the release commit carries only the version hunk.

One cohesive concern per commit, grouped by actual scope rather than a fixed count. A file's complete diff belongs to one commit: never `git add -p`, an index-only patch, or temporary edits between commits. A dependency refresh is its own `chore(deps)` commit with `package.json` and `bun.lock`; it lands first when a later commit uses what the new versions introduce, and carries any source change the upgrade itself forces.

Verify each group before committing it, in a snapshot built from a temporary index so real staging and the working tree stay untouched:

```bash
GIT_INDEX_FILE=<scratch>/index git read-tree HEAD
GIT_INDEX_FILE=<scratch>/index git add -- <paths>
GIT_INDEX_FILE=<scratch>/index git checkout-index -a --prefix=<scratch>/tree/
ln -s "$PWD/node_modules" <scratch>/tree/node_modules
(cd <scratch>/tree && bunx tsc --noEmit && bunx tsc -p tsconfig.tests.json && bun test)
```

Check the baseline (HEAD alone) first. A failure the baseline shares is a snapshot problem to resolve before judging the group: copy `node_modules` (`cp -cR`) or `git init` the export. A group that fails where the baseline passes merges with the files it depends on while still uncommitted. Never commit to find out, never run `devcheck`, `rebuild`, or `test:package` per commit, and never rewrite history to repair grouping. Then commit the same unchanged paths by pathspec, never the bare index, so nothing staged earlier rides along:

```bash
git add <paths>
git commit --only <paths> -m "<subject>" -m "<body>"
```

Every commit has a Conventional Commits subject without the version and a one- or two-line body stating why. Never a closing keyword (`Fixes #N` closes the issue on push, before its resolution comment); reference issues as `(#N)`. Plain `-m` strings, no heredoc or command substitution, never a backtick inside a double-quoted `-m`. No attribution trailers, marketing adjectives, or conversation references. Never `--no-verify` or `--amend`: a failed hook means the commit did not happen. When every concern is committed, `git status` is clean apart from reported exclusions.

## 4. Bump the version

Update `package.json` and the README version badge together. `src/version.ts` reads package metadata for both entry points and the MCP handshake; never add another version literal. Catch stragglers with `grep -rnF "<old-version>" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=changelog`; historical changelog entries stay as written. The npm name stays unscoped as `mcp-reporter`.

## 5. Write the changelog

Create `changelog/<major.minor>.x/<version>.md` from `changelog/template.md` (never edit the template) with `# <version> — YYYY-MM-DD`; no Unreleased header. Frontmatter: a quoted one-line `summary` of at most 350 characters, `breaking`, and `security`. `security: true` marks a fix in this package's source, never a dependency-only advisory. Optional `agent-notes` carry upgrade actions only.

Use only populated sections, in Added / Changed / Deprecated / Removed / Fixed / Security order, plus Dependencies. A bullet names the symbol or behavior and its consumer consequence in one or two sentences; each dependency gets its own `old → new` arrow; verified issues link by full URL. Implementation walkthroughs stay in code and issues.

Credit outside reporters. For each issue or PR the release addresses, run `gh api repos/cyanheads/mcp-reporter/issues/<N> --jq '[.user.login, .user.type, .author_association] | @tsv'`. A `User` whose association is `NONE`, `CONTRIBUTOR`, `FIRST_TIMER`, or `FIRST_TIME_CONTRIBUTOR` is thanked on that bullet (`thanks @user!`); `OWNER`, `MEMBER`, `COLLABORATOR`, and bots are not.

Write `summary` last, from the finished body, and confirm each of its claims appears there. Re-read the file, then sweep: `grep -rlF -e '</invoke>' -e '</content>' changelog/` prints nothing, since every entry ships in the tarball.

## 6. Regenerate and verify

Run `bun run changelog:build`, `bun run tree`, and `bun run example:report` when report rendering changed; inspect each generated diff. Then run `bun run devcheck`, `bun run rebuild`, and `bun run test:package`. A failure halts with its output: diagnosing it is the caller's job, and its fix lands as a new commit on top, never an amend or rewrite. A formatter fix `devcheck` makes to a committed file is its own follow-up commit.

## 7. Commit the release artifacts

One commit on top, carrying only the version bump, the changelog entry, `CHANGELOG.md`, `docs/tree.md`, and a regenerated example report: `chore(release): <version> — <theme>` with a one- or two-line body, by pathspec as in step 3. Anything else still uncommitted was made after step 3 and is committed on its own first.

## 8. Open the release PR (release PR mode)

```bash
git push -u origin release/<version>
gh pr create --base main --head release/<version> --title "<release commit subject>" --assignee @me --body-file <scratch>/pr-body.md
```

The body is written outside the repository and passed by file, never as an inline `--body`. It is the release digest the tag will carry:

```text
<theme — the changelog entry's summary line>

## Changes

- <notable behavior> (#N)
- <notable behavior> (#N, thanks @user!)
- <one grouped line for smaller tooling and docs changes>
- deps: <one headline dependency arrow, only when it earns a line>

## Gates

- `bun run devcheck` — clean, <N> tests
- `bun run rebuild` — ok
- `bun run test:package` — ok

[CHANGELOG v<version>](https://github.com/cyanheads/mcp-reporter/blob/main/changelog/<major.minor>.x/<version>.md)
```

`## Changes` follows the tag rules in `release-and-publish` step 4 and traces to the changelog entry: flat bullets, every release concern at headline granularity, at most one dependency line, `(#N)` backlinks and never a closing keyword, no narrative. `## Gates` is the only surface that carries gate results and never enters the tag. The changelog link is the last line.

Gated: halt here and report the PR URL, branch, and stack. Straight-through: continue into `release-and-publish`.

## 9. Verify end state

`git log --oneline main..HEAD` (or `-8` without a PR) shows the work commits with the release commit on top. `git status` is clean apart from reported exclusions, and `git tag --points-at HEAD` prints nothing. In release PR mode, `gh pr view --json number,url,state` reports OPEN on this branch. An existing `v<version>` tag is a halt: report the version, its target, and HEAD. Never tag, push `main`, or publish here.
