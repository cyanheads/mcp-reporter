---
name: code-simplifier
description: Cleanup pass over mcp-reporter changes or a named target — cut unnecessary complexity while preserving tested behavior and public contracts. Not a bug hunt; defects are reported, not fixed.
metadata:
  author: cyanheads
  version: "1.1"
  type: project-workflow
---

# Code simplifier

**Scope.** The default is the uncommitted work: `git diff HEAD` plus untracked files (`git ls-files --others --exclude-standard`), read directly. A named path or range (`main...HEAD` in a release review) replaces it. With nothing uncommitted and nothing named, review `git show HEAD`. Changes you do not recognize that were modified in the last few minutes belong to another writer: leave them out and list them.

Read `CLAUDE.md`, every changed file in full, and the relevant tests. Trace behavior before editing, focusing on the changed collection, transport, config, and rendering paths. Run `bun run devcheck` once as a baseline; a red baseline is reported, not attributed to this pass.

Prefer explicit types, small functions, native Node APIs, and direct SDK calls. Remove dead code, redundant state, unnecessary wrappers, and fallbacks that hide invalid data. Cut speculative generality: options, parameters, and branches no caller exercises. Apply the deletion test to a helper: if inlining it makes the complexity vanish, it was a pass-through. A shared abstraction earns its place only when it makes actual repeated behavior easier to understand.

Preserve public signatures and compatibility fields, legacy negotiation defaults, ordered bounded pagination, separate collection statuses, descriptor fidelity, credential boundaries, and unconditional cleanup. Do not replace explicit page collection with SDK aggregation or filtered list helpers without proving equivalent report semantics.

This is not a bug hunt. A defect you find is reported with `file:line`, not fixed here. A weakened test (a skipped case, a loosened assertion, a test removed with its code) is reported as a defect, never repaired by guessing the author's intent. Avoid cosmetic renames and aggressive test deduplication. A review with no change is a valid result.

Apply one behavior-preserving simplification at a time, then run `bun run devcheck` and the affected transport or package tests. Report what changed and why, the defects found, and any work left out of scope. No commits, tags, or publishing in this workflow.
