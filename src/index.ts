/**
 * MCP Server Capability Reporter
 * 
 * A tool for connecting to MCP servers and generating reports about their capabilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
  McpServersConfig, 
  ServerInfo, 
  ServerReport, 
  ReportOptions,
  ProgressEvent,
  ProgressCallback
} from './types';
import { ProgressReporter } from './utils/progress';
import { MarkdownGenerator } from './utils/markdown';

// Set default options for report generation
const DEFAULT_OPTIONS: ReportOptions = {
  outputPath: './output/mcp_server_report.md',
  includeInputSchemas: true,
  includeServerMetadata: true,
  includeExamples: true,
  progressCallback: (event: ProgressEvent) => ProgressReporter.processProgressEvent(event)
};

/**
 * MCP Server Capability Reporter
 * Connects to MCP servers and generates reports of their capabilities
 */
export class McpReporter {
  private options: ReportOptions;
  private configPath: string;
  private servers: ServerInfo[] = [];
  private reports: ServerReport[] = [];
  
  /**
   * Create a new MCP Reporter
   * 
   * @param configPath Path to the MCP servers configuration file
   * @param options Options for report generation
   */
  constructor(configPath: string, options: Partial<ReportOptions> = {}) {
    this.configPath = configPath;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Report progress event
   */
  private reportProgress(event: ProgressEvent): void {
    if (this.options.progressCallback) {
      this.options.progressCallback(event);
    }
  }
  
  /**
   * Read and parse the MCP servers configuration
   */
  public async readConfig(): Promise<void> {
    try {
      this.reportProgress({
        stage: 'init',
        message: 'Reading MCP server configuration'
      });
      
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(fileContent) as McpServersConfig;
      
      // Create server info objects
      this.servers = Object.entries(config.mcpServers)
        .filter(([_, serverConfig]) => !serverConfig.disabled)
        .map(([id, serverConfig]) => ({
          id,
          name: id,
          config: serverConfig,
          connected: false
        }));
      
      this.reportProgress({
        stage: 'init',
        message: `Found ${this.servers.length} enabled MCP servers`
      });
    } catch (error) {
      this.reportProgress({
        stage: 'error',
        message: 'Failed to read MCP server configuration',
        error: error as Error
      });
      throw error;
    }
  }
  
  /**
   * Connect to an MCP server
   */
  private async connectToServer(server: ServerInfo): Promise<void> {
    try {
      this.reportProgress({
        stage: 'connecting',
        serverId: server.id,
        message: `Connecting to ${server.id}`
      });
      
      // Debug info
      console.log(`DEBUG: Trying to connect to ${server.id}`);
      console.log(`DEBUG: Command: ${server.config.command}`);
      console.log(`DEBUG: Args: ${JSON.stringify(server.config.args)}`);
      console.log(`DEBUG: Working directory: ${process.cwd()}`);
      console.log(`DEBUG: Environment variables: ${JSON.stringify(server.config.env || {})}`);
      
      const startTime = Date.now();
      
      // Create client with stdio transport
      const client = new Client(
        {
          name: 'mcp-reporter',
          version: '1.0.0'
        },
        {
          capabilities: {
            resources: {},
            tools: {}
          }
        }
      );
      
      // Create transport
      const transport = new StdioClientTransport({
        command: server.config.command,
        args: server.config.args,
        env: server.config.env
      });
      
      // Connect to server
      await client.connect(transport);
      
      // Update server info
      server.client = client;
      server.connected = true;
      
      const connectionTime = Date.now() - startTime;
      
      this.reportProgress({
        stage: 'complete',
        serverId: server.id,
        message: `Connected to ${server.id} (${connectionTime}ms)`
      });
      
      return;
    } catch (error) {
      console.error(`DEBUG: Connection error for ${server.id}:`, error);
      server.error = (error as Error).message;
      this.reportProgress({
        stage: 'error',
        serverId: server.id,
        message: `Failed to connect to ${server.id}`,
        error: error as Error
      });
    }
  }
  
  /**
   * Fetch capabilities from a connected server
   */
  private async fetchServerCapabilities(server: ServerInfo): Promise<ServerReport> {
    const report: ServerReport = {
      ...server,
      capabilities: {
        tools: [],
        resources: [],
        resourceTemplates: []
      }
    };
    
    if (!server.connected || !server.client) {
      return report;
    }
    
    try {
      // Fetch tools
      this.reportProgress({
        stage: 'fetching',
        serverId: server.id,
        message: `Fetching tools from ${server.id}`
      });
      
      try {
        const tools = await server.client.listTools();
        // Convert the tools response to our internal ToolInfo type
        report.capabilities.tools = (tools?.tools || []).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));
      } catch (toolError) {
        // Only log if it's not the expected "Method not found" error
        if (!(toolError instanceof Error && 
              toolError.name === 'McpError' && 
              toolError.message.includes('Method not found'))) {
          console.error(`DEBUG: Error fetching tools from ${server.id}:`, toolError);
        }
        // Tools are expected - failure is worth logging as unusual
      }
      
      // Fetch resources      
      this.reportProgress({
        stage: 'fetching',
        serverId: server.id,
        message: `Fetching resources from ${server.id}`
      });
      
      try {
        const resources = await server.client.listResources();
        report.capabilities.resources = resources?.resources || [];
      } catch (resourceError) {
        // Don't log expected "Method not found" errors as many servers don't implement resources
        if (!(resourceError instanceof Error && 
              resourceError.name === 'McpError' && 
              resourceError.message.includes('Method not found'))) {
          console.error(`DEBUG: Error fetching resources from ${server.id}:`, resourceError);
        }
      }
      
      // Fetch resource templates
      this.reportProgress({
        stage: 'fetching',
        serverId: server.id,
        message: `Fetching resource templates from ${server.id}`
      });
      
      try {
        const resourceTemplates = await server.client.listResourceTemplates();
        report.capabilities.resourceTemplates = resourceTemplates?.resourceTemplates || [];
      } catch (templateError) {
        // Don't log expected "Method not found" errors as many servers don't implement resource templates
        if (!(templateError instanceof Error && 
              templateError.name === 'McpError' && 
              templateError.message.includes('Method not found'))) {
          console.error(`DEBUG: Error fetching resource templates from ${server.id}:`, templateError);
        }
      }
      
      this.reportProgress({
        stage: 'complete',
        serverId: server.id,
        message: `Completed fetching capabilities from ${server.id}`
      });
    } catch (error) {
      this.reportProgress({
        stage: 'error',
        serverId: server.id,
        message: `Error fetching capabilities from ${server.id}`,
        error: error as Error
      });
    }
    
    return report;
  }
  
  /**
   * Generate a report for all servers
   */
  private async generateReport(): Promise<string> {
    this.reportProgress({
      stage: 'reporting',
      message: 'Generating markdown report'
    });
    
    const markdown = MarkdownGenerator.generateReport(this.reports);
    
    this.reportProgress({
      stage: 'complete',
      message: 'Report generation complete'
    });
    
    return markdown;
  }
  
  /**
   * Write the report to the file system
   */
  private async writeReport(content: string): Promise<void> {
    try {
      this.reportProgress({
        stage: 'reporting',
        message: `Writing report to ${this.options.outputPath}`
      });
      
      // Create directory if it doesn't exist
      const directory = path.dirname(this.options.outputPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Write the report
      await fs.writeFile(this.options.outputPath, content, 'utf-8');
      
      this.reportProgress({
        stage: 'complete',
        message: `Report written to ${this.options.outputPath}`
      });
    } catch (error) {
      this.reportProgress({
        stage: 'error',
        message: 'Failed to write report to file',
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * Close all server connections and cleanup resources
   */
  private async closeConnections(): Promise<void> {
    try {
      this.reportProgress({
        stage: 'reporting',
        message: `Closing MCP server connections`
      });
      
      // Close each server connection
      const closePromises = this.servers
        .filter(server => server.connected && server.client)
        .map(async server => {
          try {
            await server.client!.close();
          } catch (error) {
            console.error(`Error closing connection to ${server.id}:`, error);
          }
        });
      
      // Wait for all connections to close
      await Promise.all(closePromises);
      
      this.reportProgress({
        stage: 'complete',
        message: `All connections closed`
      });
    } catch (error) {
      this.reportProgress({
        stage: 'error',
        message: 'Error while closing connections',
        error: error as Error
      });
    }
  }
  
  /**
   * Run the reporter
   */
  public async run(): Promise<void> {
    ProgressReporter.initializeReporter();
    
    try {
      // Read config
      await this.readConfig();
      
      // Connect to each server
      for (const server of this.servers) {
        await this.connectToServer(server);
      }
      
      // Fetch capabilities from connected servers
      for (const server of this.servers.filter(s => s.connected)) {
        const report = await this.fetchServerCapabilities(server);
        this.reports.push(report);
      }
      
      // Add failed servers to reports
      for (const server of this.servers.filter(s => !s.connected)) {
        this.reports.push({
          ...server,
          capabilities: {
            tools: [],
            resources: [],
            resourceTemplates: []
          }
        });
      }
      
      // Generate and write report
      const reportContent = await this.generateReport();
      await this.writeReport(reportContent);

      // Close all connections
      await this.closeConnections();
      
      this.reportProgress({
        stage: 'complete',
        message: 'MCP server capability reporting complete'
      });
    } catch (error) {
      this.reportProgress({
        stage: 'error',
        message: 'MCP server capability reporting failed',
        error: error as Error
      });
      throw error;
    }
  }
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  try {
    // Path to MCP servers config
    const configPath = path.resolve(process.cwd(), 'mcp-servers.json');
    
    // Output path for the report
    const outputPath = path.resolve(process.cwd(), 'output', 'mcp_server_report.md');
    
    // Create reporter
    const reporter = new McpReporter(configPath, {
      outputPath
    });
    
    // Run reporter
    await reporter.run();
  } catch (error) {
    console.error('Fatal error:', (error as Error).message);
    process.exit(1);
  } finally {
    // Ensure process exits
    process.exit(0);
  }
}

// If this file is being run directly, run the main function
if (require.main === module) {
  main().catch(console.error);
}