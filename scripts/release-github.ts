/** scripts/release-github.ts — Publish the annotated tag digest as the GitHub Release. */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const tag = `v${version}`;
const subject = execFileSync(
  'git',
  ['for-each-ref', `refs/tags/${tag}`, '--format=%(contents:subject)'],
  { encoding: 'utf8' },
).trim();
const type = execFileSync('git', ['cat-file', '-t', tag], { encoding: 'utf8' }).trim();
if (!subject || type !== 'tag')
  throw new Error(`Create annotated tag ${tag} before publishing a release.`);
const title = `${tag}: ${subject}`;
const args = ['release', 'create', tag, '--verify-tag', '--notes-from-tag', '--title', title];
if (process.argv.includes('--dry-run'))
  console.log(JSON.stringify({ command: 'gh', args }, null, 2));
else {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status === 0) process.stdout.write(result.stdout);
  else if (/release already exists/i.test(result.stderr))
    execFileSync('gh', ['release', 'edit', tag, '--title', title], { stdio: 'inherit' });
  else {
    process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
  }
}
