/** src/utils/progress.ts — CLI progress on stderr; library callers opt in explicitly. */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { ProgressEvent } from '../types/index.js';

let spinner: Ora | undefined;
/** Manage the CLI spinner without writing to stdout. */
export const ProgressReporter = {
  /** Start a reporting session. */
  initializeReporter(): void {
    ProgressReporter.stop();
    console.error(chalk.blue('mcp-reporter'));
  },
  /** Finish an active spinner on any exit path. */
  stop(): void {
    spinner?.stop();
    spinner = undefined;
  },
  /** Display one safe reporter event. */
  processProgressEvent(event: ProgressEvent): void {
    spinner ??= ora({ stream: process.stderr, discardStdin: false });
    if (event.stage === 'error') spinner.fail(event.message);
    else if (event.stage === 'complete') spinner.succeed(event.message);
    else spinner.start(event.message);
  },
};
