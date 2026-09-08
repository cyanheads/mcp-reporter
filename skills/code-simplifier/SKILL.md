---
name: code-simplifier
description: Review substantial mcp-reporter changes for unnecessary complexity while preserving tested behavior and public contracts.
metadata:
  author: cyanheads
  version: "1.0"
  type: project-workflow
---

# Code simplifier

Read `CLAUDE.md`, the full diff, every changed source file, and relevant tests. Trace behavior before editing. Focus on the changed collection, transport, config and rendering paths.

Prefer explicit types, small functions, native Node APIs and direct SDK calls. Remove dead code, redundant state, unnecessary wrappers and fallbacks that hide invalid data. A shared abstraction earns its place only when it makes actual repeated behavior easier to understand.

Preserve public signatures and compatibility fields, legacy negotiation defaults, ordered bounded pagination, separate collection statuses, descriptor fidelity, credential boundaries and unconditional cleanup. Do not replace explicit page collection with SDK aggregation or filtered list helpers without proving equivalent report semantics.

Avoid cosmetic renames, speculative flexibility and aggressive test deduplication. If a helper makes control flow or typing harder, inline it. A review with no change is a valid result.

Apply one behavior-preserving simplification at a time, then run `bun run devcheck` and the affected transport/package tests. Report what changed and why, or confirm the changed code was already appropriately scoped. No commits, tags or publishing in this workflow.
