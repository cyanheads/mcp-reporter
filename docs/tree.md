# mcp-reporter - Directory Structure

Generated on: 2026-09-08 17:17:05

```text
mcp-reporter/
├── .agents/
│   └── skills
├── .claude/
│   └── skills
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── CODE_OF_CONDUCT.md
│   ├── CONTRIBUTING.md
│   ├── FUNDING.yml
│   └── SECURITY.md
├── assets/
│   └── preview-image.png
├── changelog/
│   ├── 1.0.x/
│   ├── 1.1.x/
│   └── template.md
├── docs/
│   ├── example-report.md
│   └── upgrading.md
├── scripts/
│   ├── build-changelog.ts
│   ├── build.ts
│   ├── clean.ts
│   ├── example-report.ts
│   ├── list-skills.ts
│   ├── release-github.ts
│   └── tree.ts
├── skills/
│   ├── code-simplifier/
│   │   └── SKILL.md
│   ├── field-test/
│   │   └── SKILL.md
│   ├── git-wrapup/
│   │   └── SKILL.md
│   ├── maintenance/
│   │   └── SKILL.md
│   ├── polish-docs-meta/
│   │   └── SKILL.md
│   ├── release-and-publish/
│   │   └── SKILL.md
│   ├── report-issue-local/
│   │   └── SKILL.md
│   └── README.md
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── markdown.ts
│   │   └── progress.ts
│   ├── cli.ts
│   ├── config.ts
│   ├── index.ts
│   ├── is-entry-point.ts
│   └── version.ts
├── tests/
│   ├── fixtures/
│   │   ├── legacy-server.mjs
│   │   └── modern-server.mjs
│   ├── baseline.test.ts
│   ├── cli.test.ts
│   ├── config.test.ts
│   ├── http.test.ts
│   ├── integration.test.ts
│   ├── package-smoke.ts
│   └── reporting.test.ts
├── .gitignore
├── AGENTS.md
├── biome.json
├── bun.lock
├── CHANGELOG.md
├── CLAUDE.md
├── LICENSE
├── mcp-servers.json.example
├── package.json
├── README.md
├── tsconfig.json
└── tsconfig.tests.json
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._
