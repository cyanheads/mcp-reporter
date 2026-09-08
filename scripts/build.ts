/** scripts/build.ts — Mark compiled command entry points executable. */
import { chmod } from 'node:fs/promises';

if (process.platform !== 'win32') {
  await Promise.all(['dist/cli.js', 'dist/index.js'].map((file) => chmod(file, 0o755)));
}
