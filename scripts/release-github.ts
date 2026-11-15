/** scripts/release-github.ts — Validate the annotated tag, then publish its message as the GitHub Release. */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const USAGE = `Usage: bun run release:github [-- <option>...]

Creates the GitHub Release for the package version's annotated tag, or repairs its title.

Options:
  --check       Validate the tag annotation only; no gh calls
  --dry-run     Print the gh command instead of running it
  -h, --help    Show this help`;

/** A subject longer than this reads as a digest, not a release title. */
const MAX_SUBJECT_LENGTH = 72;

/** A Markdown heading, a Keep a Changelog section name, or any non-bullet line ending in a colon. */
const SECTION_HEADER =
  /^(?:#{1,6}\s.*|(?:Added|Changed|Deprecated|Removed|Fixed|Security|Dependencies)\s*:?|[^\s\-*+[].*:)$/;

/** The parts of an annotated tag that become the GitHub Release title and body. */
export interface TagMessage {
  /** `%(objecttype)`: `tag` when annotated, `commit` when lightweight. */
  objectType: string;
  subject: string;
  body: string;
}

/**
 * Violations of the release-body rules, one message each; empty means publishable.
 * `--notes-from-tag` publishes the body verbatim, so a malformed tag is a malformed public release.
 * Text after the changelog link on the final line (` · release PR #N`) is allowed.
 */
export function checkTagMessage(tag: TagMessage, version: string): string[] {
  if (tag.objectType !== 'tag')
    return [
      `v${version} is a lightweight tag — recreate it annotated: git tag -a v${version} --cleanup=whitespace -F <file>`,
    ];
  const errors: string[] = [];
  const { subject } = tag;
  if (subject.length > MAX_SUBJECT_LENGTH)
    errors.push(
      `subject is ${subject.length} characters — keep it one short theme (≤${MAX_SUBJECT_LENGTH}); the bullets carry the digest`,
    );
  if (subject.includes(version))
    errors.push(`subject contains "${version}" — GitHub prepends "v${version}:" to the title`);
  if (subject.includes(';')) errors.push('subject contains ";" — one theme, not a list of changes');
  if (tag.body.includes('-----BEGIN'))
    errors.push(
      'body contains a signature block — recreate the tag with --cleanup=whitespace before it is pushed',
    );
  const lines = tag.body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = lines.filter((line) => SECTION_HEADER.test(line));
  if (headers.length > 0)
    errors.push(
      `body has section headers (${headers.map((line) => `"${line}"`).join(', ')}) — flat bullets only; sections belong in the changelog entry`,
    );
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const changelogLink = new RegExp(
    `^\\[CHANGELOG v${escaped}\\]\\(\\S+/changelog/\\d+\\.\\d+\\.x/${escaped}\\.md\\)`,
  );
  if (!changelogLink.test(lines.at(-1) ?? ''))
    errors.push(
      `final line is not the changelog link — end the body with "[CHANGELOG v${version}](https://github.com/cyanheads/mcp-reporter/blob/main/changelog/<major.minor>.x/${version}.md)"`,
    );
  return errors;
}

/** Strict CLI options: an unknown option, a positional, or a value on a flag exits 1 before anything runs. */
function readOptions() {
  try {
    return parseArgs({
      options: {
        check: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
      allowPositionals: false,
    }).values;
  } catch (error) {
    if (!(error as NodeJS.ErrnoException).code?.startsWith('ERR_PARSE_ARGS_')) throw error;
    console.error(`${(error as Error).message}\n\n${USAGE}`);
    process.exit(1);
  }
}

function main(): void {
  const options = readOptions();
  if (options.help) {
    console.log(USAGE);
    return;
  }
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const tag = `v${version}`;
  const fields = execFileSync(
    'git',
    [
      'for-each-ref',
      `refs/tags/${tag}`,
      '--format=%(objecttype)%00%(contents:subject)%00%(contents:body)',
    ],
    { encoding: 'utf8' },
  );
  if (!fields) {
    console.error(
      `Tag ${tag} not found. Create it first: git tag -a ${tag} --cleanup=whitespace -F <file>`,
    );
    process.exit(1);
  }
  const [objectType = '', subject = '', body = ''] = fields.split('\0');
  const errors = checkTagMessage({ objectType, subject, body }, version);
  if (errors.length > 0) {
    console.error(`Tag ${tag} is not publishable:`);
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
  }
  if (options.check) {
    console.log(`Tag ${tag} OK.`);
    return;
  }
  const title = `${tag}: ${subject}`;
  const args = ['release', 'create', tag, '--verify-tag', '--notes-from-tag', '--title', title];
  if (options['dry-run']) {
    console.log(JSON.stringify({ command: 'gh', args }, null, 2));
    return;
  }
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

if (import.meta.main) main();
