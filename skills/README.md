# Project workflows

These workflows adapt the public [mcp-ts-core skills](https://github.com/cyanheads/mcp-ts-core/tree/main/framework-skills) to an MCP client and npm CLI. They are project-owned adaptations, not automatic framework mirrors. Read `CLAUDE.md` and run `bun run list-skills` to discover them.

| Skill | Purpose |
| --- | --- |
| [field-test](field-test/SKILL.md) | Verify collection, protocol modes, rendering, and process cleanup |
| [maintenance](maintenance/SKILL.md) | Update dependencies and reconcile SDK behavior |
| [code-simplifier](code-simplifier/SKILL.md) | Reduce implementation complexity without changing behavior |
| [polish-docs-meta](polish-docs-meta/SKILL.md) | Keep README, package and repo metadata, examples, and skills aligned |
| [report-issue-local](report-issue-local/SKILL.md) | Validate, deduplicate, and file actionable project issues |
| [git-wrapup](git-wrapup/SKILL.md) | Version, commit by concern, and open the release PR |
| [release-pr-review](release-pr-review/SKILL.md) | Review and fix an open release PR before it ships |
| [release-and-publish](release-and-publish/SKILL.md) | Fast-forward `main`, tag, and publish to npm and GitHub |

Adaptation reference: mcp-ts-core 0.13.22; git-wrapup 1.33, release-pr-review 1.9, release-and-publish 2.26, code-simplifier 1.8, and report-issue-local 1.13, plus its `templates/.github/` issue forms and CodeQL workflow. The project keeps their release PR flow, commit, changelog, and tag structure while omitting server registries, MCP bundles, and containers. `scripts/release-github.ts` carries the reference's tag check without bundle handling; the tree, skill-index, and changelog-index scripts originate from the same reference, and the CLI build is project-specific.

`skills/` is the source. Agent discovery directories link to it, so edits cannot drift between copies. Review future upstream changes against the reporter's actual interfaces and package scripts before adopting them.
