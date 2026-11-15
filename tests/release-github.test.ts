/** tests/release-github.test.ts — Tag annotations that would publish a malformed GitHub Release are refused. */
import { expect, test } from 'bun:test';
import { checkTagMessage } from '../scripts/release-github.js';

const link =
  '[CHANGELOG v1.3.0](https://github.com/cyanheads/mcp-reporter/blob/main/changelog/1.3.x/1.3.0.md)';
const tag = (subject: string, body: string, objectType = 'tag') => ({ objectType, subject, body });

test('a flat annotation ending in its changelog link is publishable, with or without the PR suffix', () => {
  const body = `- servers report faster\n- deps: zod ^4.6.7 → ^4.7.0\n\n${link}`;
  expect(checkTagMessage(tag('Faster collection', body), '1.3.0')).toEqual([]);
  expect(checkTagMessage(tag('Faster collection', `${body} · release PR #12`), '1.3.0')).toEqual(
    [],
  );
});

test('a lightweight tag is refused before its message is read', () => {
  const [error, ...rest] = checkTagMessage(tag('Faster collection', link, 'commit'), '1.3.0');
  expect(error).toContain('lightweight');
  expect(rest).toEqual([]);
});

test('subject, body, and final-line violations are each reported', () => {
  const errors = checkTagMessage(
    tag(
      `1.3.0 — ${'x'.repeat(70)}; more`,
      `## Changes\nFixed:\n- one\n-----BEGIN SSH SIGNATURE-----\n${link.replaceAll('1.3.0', '1.2.0')}`,
    ),
    '1.3.0',
  );
  for (const fragment of ['characters', 'contains "1.3.0"', 'contains ";"', 'signature block'])
    expect(errors.some((error) => error.includes(fragment))).toBe(true);
  expect(errors.find((error) => error.includes('section headers'))).toContain(
    '"## Changes", "Fixed:"',
  );
  expect(errors.some((error) => error.startsWith('final line'))).toBe(true);
  expect(errors).toHaveLength(6);
});
