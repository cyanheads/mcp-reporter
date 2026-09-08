/** scripts/clean.ts — Remove only generated build output. */
import { rm } from 'node:fs/promises';

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
