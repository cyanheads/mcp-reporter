/** tests/cli.test.ts — CLI options and process exits using synthetic stdio fixtures. */
import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { McpReporter } from '../src/index.js';
import { VERSION } from '../src/version.js';

async function cli(args: string[]) {
  const child = Bun.spawn([process.execPath, 'src/cli.ts', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, code };
}
test('CLI version comes from package metadata and invalid era fails', async () => {
  expect((await cli(['--version'])).stdout.trim()).toBe(VERSION);
  expect((await cli(['--protocol-era', 'invalid'])).code).toBe(1);
  expect((await cli(['--max-pages', '0'])).code).toBe(1);
});
test('negative CLI flags hide their sections and quiet mode produces no progress', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-cli-'));
  try {
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
    const result = await cli([
      '--config',
      config,
      '--output',
      output,
      '--no-schemas',
      '--no-metadata',
      '--no-examples',
      '--quiet',
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    const report = await readFile(output, 'utf8');
    expect(report).toContain('tool-2');
    expect(report).not.toContain('Input Schema');
    expect(report).not.toContain('Server Information');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('invalid JSON fails without printing the credential-bearing content', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-cli-'));
  try {
    const config = join(dir, 'config.json');
    await writeFile(config, '{"password":"secret-sentinel" invalid');
    const result = await cli(['--config', config, '--quiet']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('not valid JSON');
    expect(result.stderr).not.toContain('secret-sentinel');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
for (const protocolEra of ['legacy', 'auto', '2026-07-28'] as const) {
  test(`SDK stdio fixture supports ${protocolEra}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-stdio-'));
    try {
      const config = join(dir, 'config.json');
      const outputPath = join(dir, 'report.md');
      await writeFile(
        config,
        JSON.stringify({
          mcpServers: {
            fixture: { command: 'node', args: [resolve('tests/fixtures/modern-server.mjs')] },
          },
        }),
      );
      await new McpReporter(config, { outputPath, protocolEra }).run();
      const report = await readFile(outputPath, 'utf8');
      expect(report).toContain('modern-tool');
      expect(report).toContain(protocolEra === 'legacy' ? 'legacy' : '2026-07-28');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
test('pinned modern mode rejects a legacy-only peer without aborting the report', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-pin-'));
  try {
    const config = join(dir, 'config.json');
    const outputPath = join(dir, 'report.md');
    await writeFile(
      config,
      JSON.stringify({
        mcpServers: {
          legacy: { command: 'node', args: [resolve('tests/fixtures/legacy-server.mjs')] },
        },
      }),
    );
    await new McpReporter(config, { outputPath, protocolEra: '2026-07-28' }).run();
    expect((await readFile(outputPath, 'utf8')).replaceAll('\\', '')).toContain(
      'ERA_NEGOTIATION_FAILED',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const mode of ['--silent-probe', '--exit-on-probe']) {
  test(`auto falls back after ${mode} and reaps both stdio processes`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-reporter-probe-'));
    try {
      const config = join(dir, 'config.json');
      const outputPath = join(dir, 'report.md');
      const pids = join(dir, 'pids.txt');
      await writeFile(
        config,
        JSON.stringify({
          mcpServers: {
            legacy: {
              command: 'node',
              args: [resolve('tests/fixtures/legacy-server.mjs'), mode],
              env: { FIXTURE_PID_FILE: pids },
            },
          },
        }),
      );
      await new McpReporter(config, { outputPath, protocolEra: 'auto', timeoutMs: 500 }).run();
      const report = await readFile(outputPath, 'utf8');
      expect(report).toContain('tool-2');
      expect(report).toContain('legacy');
      const processes = (await readFile(pids, 'utf8')).trim().split('\n').map(Number);
      expect(processes.length).toBe(2);
      for (const pid of processes) expect(() => process.kill(pid, 0)).toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
