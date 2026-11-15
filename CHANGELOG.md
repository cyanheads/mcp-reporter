# Changelog

All notable changes to this project. Each entry links to its full per-version file in [changelog/](changelog/).

## [1.2.0](changelog/1.2.x/1.2.0.md) — 2026-11-15

Servers are collected four at a time, same-origin HTTP redirects are followed, and descriptions and instructions render as verbatim text. ServerInfo.client is deprecated. Dependencies are updated, including ora 10 and MCP SDK 2.4.

## [1.1.2](changelog/1.1.x/1.1.2.md) — 2026-09-08

Reuse the server configuration schema and collect changelog entries once per run.

## [1.1.1](changelog/1.1.x/1.1.1.md) — 2026-09-08

Bound the complete HTTP handshake by timeoutMs so stalled initialized responses cannot block remaining servers or report generation.

## [1.1.0](changelog/1.1.x/1.1.0.md) — 2026-09-08 · ⚠️ Breaking · 🛡️ Security

Add HTTP and opt-in modern protocol reporting, prompts and descriptor metadata; retain every capability page with explicit incomplete states, protect configured credentials, and adopt ESM, Node 22.12 and local verification workflows.

## [1.0.1](changelog/1.0.x/1.0.1.md) — 2025-03-15

README formatting cleanup

## [1.0.0](changelog/1.0.x/1.0.0.md) — 2025-03-15

Initial stdio capability reporter
