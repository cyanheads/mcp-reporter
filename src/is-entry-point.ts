/** src/is-entry-point.ts — Recognize Node/Bun executables through npm and filesystem symlinks. */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
/** Determine whether a module was invoked directly rather than imported. */
export function isEntryPoint(url: string): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(url);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}
