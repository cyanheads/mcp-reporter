#!/usr/bin/env node
/**
 * MCP Server Capability Reporter CLI
 * 
 * Command line interface for the MCP server capability reporter
 */

import { Command } from 'commander';
import * as path from 'path';
import { McpReporter } from './index';

// Create CLI program
const program = new Command();

// Configure program
program
  .name('mcp-reporter')
  .description('Generate a report of MCP server capabilities')
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to the MCP servers configuration file', 'mcp-servers.json')
  .option('-o, --output <path>', 'Output path for the report', 'output/mcp_server_report.md')
  .option('-s, --schemas', 'Include input schemas in the report', true)
  .option('-m, --metadata', 'Include server metadata in the report', true)
  .option('-e, --examples', 'Include examples in the report', true)
  .parse(process.argv);

// Get options
const options = program.opts();

// Run the reporter
async function run() {
  try {
    // Resolve paths
    const configPath = path.resolve(process.cwd(), options.config);
    const outputPath = path.resolve(process.cwd(), options.output);
    
    console.log(`Using configuration from: ${configPath}`);
    console.log(`Report will be saved to: ${outputPath}`);
    
    // Create reporter
    const reporter = new McpReporter(configPath, {
      outputPath,
      includeInputSchemas: options.schemas,
      includeServerMetadata: options.metadata,
      includeExamples: options.examples
    });
    
    // Run reporter
    await reporter.run();
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

// Run the program
run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});