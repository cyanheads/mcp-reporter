/**
 * Progress Reporting Utilities
 * ============================
 * 
 * This utility provides standardized progress reporting functionality for
 * console-based applications with spinner animations and timing statistics.
 * Provides utilities for reporting progress to the console
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { ProgressEvent } from '../types';

/**
 * Progress Reporter Utility
 * 
 * A static utility class that manages progress reporting for command-line operations.
 * Handles various progress stages including initialization, server connections,
 * data fetching, and error reporting with visual spinners and timing statistics.
 * 
 * The reporter tracks:
 * - Overall process execution time
 * - Individual server connection durations
 * - Success/failure states with appropriate visual indicators
 * 
 * @example
 * ProgressReporter.initializeReporter();
 * ProgressReporter.processProgressEvent({ stage: 'connecting', serverId: 'my-server', message: 'Connecting to MyServer' });
 */
export class ProgressReporter {
  private static spinner: Ora | null = null;
  private static startTime: number = 0;
  private static serverTimes: Record<string, { start: number; end?: number }> = {};
  
  /**
   * Initializes the progress reporter by setting up timers and displaying the application header
   */
  public static initializeReporter(): void {
    this.startTime = Date.now();
    this.serverTimes = {};
    console.log(chalk.bold.blue('🔍 MCP Server Capability Reporter'));
    console.log(chalk.gray(`Started at: ${new Date().toLocaleString()}`));
    console.log('');
  }

  /**
   * Processes a progress event and updates the console display accordingly
   * 
   * This is the main entry point for handling all types of progress events.
   * The method routes each event to the appropriate handler based on the event stage.
   *
   * @param {ProgressEvent} progressEvent - The progress event containing stage, message, and optional data
   * @returns {void}
   */
  public static processProgressEvent(progressEvent: ProgressEvent): void {
    switch (progressEvent.stage) {
      case 'init':
        this.processInitializationEvent(progressEvent);
        break;
      case 'connecting':
        this.processServerConnectionEvent(progressEvent);
        break;
      case 'fetching':
        this.processDataFetchingEvent(progressEvent);
        break;
      case 'reporting':
        this.processReportGenerationEvent(progressEvent);
        break;
      case 'complete':
        this.processCompletionEvent(progressEvent);
        break;
      case 'error':
        this.processErrorEvent(progressEvent);
        break;
    }
  }

  /**
   * Starts or updates a spinner with the given text
   *
   * @param {string} spinnerText - The text to display in the spinner
   * @returns {void}
   */
  private static startOrUpdateProgressSpinner(spinnerText: string): void {
    if (this.spinner) {
      this.spinner.text = spinnerText;
    } else {
      this.spinner = ora({
        text: spinnerText,
        spinner: 'dots',
        color: 'blue'
      }).start();
    }
  }

  /**
   * Stops the spinner with a success message
   *
   * @param {string} successMessage - The success message to display
   * @returns {void}
   */
  private static completeProgressSpinnerWithSuccess(successMessage: string): void {
    if (this.spinner) {
      this.spinner.succeed(successMessage);
      this.spinner = null;
    }
  }

  /**
   * Stops the spinner with an error message
   *
   * @param {string} errorMessage - The error message to display
   * @returns {void}
   */
  private static completeProgressSpinnerWithFailure(errorMessage: string): void {
    if (this.spinner) {
      this.spinner.fail(errorMessage);
      this.spinner = null;
    }
  }

  /**
   * Processes the initialization event
   *
   * @param {ProgressEvent} initEvent - The initialization event
   * @returns {void}
   */
  private static processInitializationEvent(initEvent: ProgressEvent): void {
    this.startOrUpdateProgressSpinner(initEvent.message);
  }

  /**
   * Processes a server connection event by starting a timer and updating the spinner
   *
   * @param {ProgressEvent} connectionEvent - The server connection event
   * @returns {void}
   */
  private static processServerConnectionEvent(connectionEvent: ProgressEvent): void {
    if (connectionEvent.serverId) {
      this.serverTimes[connectionEvent.serverId] = { start: Date.now() };
      this.startOrUpdateProgressSpinner(`${connectionEvent.message}`);
    }
  }

  /**
   * Processes a data fetching event by updating the spinner with the current operation
   *
   * @param {ProgressEvent} fetchEvent - The data fetching event
   * @returns {void}
   */
  private static processDataFetchingEvent(fetchEvent: ProgressEvent): void {
    this.startOrUpdateProgressSpinner(`${fetchEvent.message}`);
  }

  /**
   * Processes a report generation event by updating the spinner
   *
   * @param {ProgressEvent} reportEvent - The report generation event
   * @returns {void}
   */
  private static processReportGenerationEvent(reportEvent: ProgressEvent): void {
    this.startOrUpdateProgressSpinner(`${reportEvent.message}`);
  }

  /**
   * Processes a completion event by stopping the spinner and displaying timing statistics
   * 
   * For server-specific completion events, shows the server processing time.
   * For the final completion event, displays all server times and total execution time.
   *
   * @param {ProgressEvent} completionEvent - The completion event
   * @returns {void}
   */
  private static processCompletionEvent(completionEvent: ProgressEvent): void {
    if (completionEvent.serverId) {
      const serverTime = this.serverTimes[completionEvent.serverId];
      if (serverTime) {
        serverTime.end = Date.now();
        const duration = serverTime.end - serverTime.start;
        this.completeProgressSpinnerWithSuccess(`${completionEvent.message} (${duration}ms)`);
      } else {
        this.completeProgressSpinnerWithSuccess(`${completionEvent.message}`);
      }
    } else {
      const totalTime = Date.now() - this.startTime;
      this.completeProgressSpinnerWithSuccess(`${completionEvent.message} (${totalTime}ms)`);

      // Only print statistics for the final completion event
      if (completionEvent.message === 'MCP server capability reporting complete') {
        // Print statistics
        console.log('');
        console.log(chalk.bold('Server Connection Times:'));
        Object.entries(this.serverTimes).forEach(([serverIdentifier, timingData]) => {
          if (timingData.end) {
            const duration = timingData.end - timingData.start;
            console.log(`  ${chalk.cyan(serverIdentifier)}: ${duration}ms`);
          } else {
            console.log(`  ${chalk.red(serverIdentifier)}: Failed to connect`);
          }
        });
        console.log('');
        console.log(chalk.green(`✨ Total time: ${totalTime}ms`));
      }
    }
  }

  /**
   * Processes an error event by displaying the error message and details
   * 
   * For server-specific errors, tracks the failure in the server times.
   *
   * @param {ProgressEvent} errorEvent - The error event
   * @returns {void}
   */
  private static processErrorEvent(errorEvent: ProgressEvent): void {
    if (errorEvent.serverId && this.serverTimes[errorEvent.serverId]) {
      this.completeProgressSpinnerWithFailure(`${chalk.red('Error')}: ${errorEvent.message}`);
      if (errorEvent.error) {
        console.error(chalk.red('  Details:'), errorEvent.error.message);
      }
    } else {
      this.completeProgressSpinnerWithFailure(`${chalk.red('Error')}: ${errorEvent.message}`);
      if (errorEvent.error) {
        console.error(chalk.red('  Details:'), errorEvent.error.message);
      }
    }
  }
}