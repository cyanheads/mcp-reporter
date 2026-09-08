/** tests/package-smoke.ts — Verify the actual npm tarball under Node.js. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-package-'));
try {
  const metadata = JSON.parse(await readFile('package.json', 'utf8')) as {
    name: string;
    version: string;
  };
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dir], {
      encoding: 'utf8',
      env: { ...process.env, npm_config_cache: join(dir, 'cache') },
    }),
  ) as { filename: string; files: { path: string }[] }[];
  const archive = packed[0];
  assert(archive);
  for (const file of archive.files) {
    assert(
      !/^(?:tests|output|backups|node_modules|\.git|\.claude|\.agents)\//.test(file.path),
      `Unexpected packaged path: ${file.path}`,
    );
    assert(!/(?:^|\/)\.env(?:\.|$)/.test(file.path), 'Environment file in tarball');
    assert.notEqual(file.path, 'mcp-servers.json');
  }
  for (const path of [
    'dist/cli.js',
    'dist/index.js',
    'dist/index.d.ts',
    'README.md',
    'LICENSE',
    'mcp-servers.json.example',
    'skills/git-wrapup/SKILL.md',
  ])
    assert(
      archive.files.some((file) => file.path === path),
      `Missing package file: ${path}`,
    );
  execFileSync('tar', ['-xzf', join(dir, archive.filename), '-C', dir]);
  const unpacked = join(dir, 'package');
  await symlink(resolve('node_modules'), join(unpacked, 'node_modules'), 'dir');
  const cli = join(unpacked, 'dist/cli.js');
  assert.equal(
    execFileSync('node', [cli, '--version'], { encoding: 'utf8' }).trim(),
    metadata.version,
  );
  assert.match(execFileSync('node', [cli, '--help'], { encoding: 'utf8' }), /--protocol-era/);
  const config = join(dir, 'config.json');
  const output = join(dir, 'report.md');
  await writeFile(
    config,
    JSON.stringify({
      mcpServers: {
        fixture: { command: 'node', args: [resolve('tests/fixtures/legacy-server.mjs')] },
      },
    }),
  );
  execFileSync('node', [cli, '--config', config, '--output', output, '--quiet']);
  assert.match(await readFile(output, 'utf8'), /tool-2/);
  const moduleUrl = pathToFileURL(join(unpacked, 'dist/index.js')).href;
  const code = `import { McpReporter, MarkdownGenerator } from ${JSON.stringify(moduleUrl)}; if (typeof MarkdownGenerator.generateReport !== 'function') throw new Error('Missing renderer'); await new McpReporter(${JSON.stringify(config)}, { outputPath: ${JSON.stringify(output)} }).run();`;
  execFileSync('node', ['--input-type=module', '-e', code]);
  const commonJs = `const { McpReporter, MarkdownGenerator } = require(${JSON.stringify(join(unpacked, 'dist/index.js'))}); if (typeof MarkdownGenerator.generateReport !== 'function') throw new Error('Missing renderer'); new McpReporter(${JSON.stringify(config)}, { outputPath: ${JSON.stringify(output)} }).run().catch(error => { console.error(error); process.exitCode = 1; });`;
  execFileSync('node', ['-e', commonJs]);
  assert.match(await readFile(output, 'utf8'), /tool-2/);
  console.log(
    `Verified ${metadata.name}@${metadata.version}: ${archive.files.length} packaged files, Node CLI and library, complete stdio report.`,
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
