# Project workflows

These workflows adapt the public [mcp-ts-core skills](https://github.com/cyanheads/mcp-ts-core/tree/main/skills) to an MCP client and npm CLI. They are project-owned adaptations, not automatic framework mirrors. Read `CLAUDE.md` and run `bun run list-skills` to discover them.

| Skill | Purpose |
| --- | --- |
| [field-test](field-test/SKILL.md) | Verify collection, protocol modes, rendering, and process cleanup |
| [maintenance](maintenance/SKILL.md) | Update dependencies and reconcile SDK behavior |
| [code-simplifier](code-simplifier/SKILL.md) | Reduce implementation complexity without changing behavior |
| [polish-docs-meta](polish-docs-meta/SKILL.md) | Keep README, package metadata, examples, and skills aligned |
| [report-issue-local](report-issue-local/SKILL.md) | Validate, deduplicate, and file actionable project issues |
| [git-wrapup](git-wrapup/SKILL.md) | Review, version, commit, and create a local annotated tag |
| [release-and-publish](release-and-publish/SKILL.md) | Publish approved releases to npm and GitHub |

Adaptation reference: mcp-ts-core 0.12.7; git-wrapup 1.12 and release-and-publish 2.13. The project retains their commit, changelog, and tag structure while omitting server registries, MCP bundles, and containers. The tree, skill-index, and changelog-index scripts originate from the same reference; the CLI build and release helper are project-specific.

`skills/` is the source. Agent discovery directories link to it, so edits cannot drift between copies. Review future upstream changes against the reporter's actual interfaces and package scripts before adopting them.
