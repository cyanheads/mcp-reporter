/**
 * Enhanced Markdown Report Generator
 * Utilities for generating professional markdown reports from MCP server capabilities
 * with improved visualizations and consistent formatting
 */

import { ResourceInfo, ResourceTemplateInfo, ServerReport, ToolInfo } from '../types';

export class MarkdownGenerator {
  /**
   * Generate a comprehensive markdown report for all servers
   */
  public static generateReport(serverReports: ServerReport[]): string {
    const timestamp = new Date().toLocaleString();
    const connectedServers = serverReports.filter(server => server.connected);
    const failedServers = serverReports.filter(server => !server.connected);
    
    let markdown = '';
    
    // Title and summary with improved formatting
    markdown += `# MCP Server Capabilities Report\n\n`;
    markdown += `*Generated on: ${timestamp}*\n\n`;
    markdown += `## Executive Summary\n\n`;
    
    // Enhanced metrics summary with better visualization
    markdown += this.generateMetricsSummary(serverReports, connectedServers, failedServers);
    
    // Add failure summary if applicable
    if (failedServers.length > 0) {
      markdown += `### Connection Failures\n\n`;
      markdown += this.generateFailuresTable(failedServers);
      markdown += `\n`;
    }
    
    // Add visual server summary section
    markdown += `\n### Connected Servers Overview\n\n`;
    markdown += this.generateServerSummaryCards(connectedServers);
    markdown += `\n`;
    
    // Table of contents with better formatting
    markdown += `## Table of Contents\n\n`;
    connectedServers.forEach((server, index) => {
      markdown += `${index + 1}. [${server.id}](#${server.id.toLowerCase().replace(/\s+/g, '-')})\n`;
    });
    markdown += `\n`;
    
    // Detailed server reports
    connectedServers.forEach(server => {
      markdown += this.generateServerSection(server);
    });
    
    return markdown;
  }

  /**
   * Generate a visual metrics summary
   */
  private static generateMetricsSummary(
    allServers: ServerReport[], 
    connectedServers: ServerReport[], 
    failedServers: ServerReport[]
  ): string {
    const totalTools = connectedServers.reduce((sum, server) => 
      sum + server.capabilities.tools.length, 0);
    const totalResources = connectedServers.reduce((sum, server) => 
      sum + server.capabilities.resources.length, 0);
    const totalTemplates = connectedServers.reduce((sum, server) => 
      sum + server.capabilities.resourceTemplates.length, 0);
    
    let summary = '';
    
    // Create a metrics dashboard
    summary += `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">\n\n`;
    
    // Server metrics card
    summary += `<div style="flex: 1; min-width: 200px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    summary += `<h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Server Status</h3>\n`;
    summary += `<div style="font-size: 36px; font-weight: bold; color: #0066cc;">${connectedServers.length}/${allServers.length}</div>\n`;
    summary += `<div style="color: #666;">Connected Servers</div>\n`;
    summary += `</div>\n\n`;
    
    // Tools metrics card
    summary += `<div style="flex: 1; min-width: 200px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    summary += `<h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Tools</h3>\n`;
    summary += `<div style="font-size: 36px; font-weight: bold; color: #339933;">${totalTools}</div>\n`;
    summary += `<div style="color: #666;">Available Tools</div>\n`;
    summary += `</div>\n\n`;
    
    // Resources metrics card
    summary += `<div style="flex: 1; min-width: 200px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    summary += `<h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333;">Resources</h3>\n`;
    summary += `<div style="font-size: 36px; font-weight: bold; color: #993399;">${totalResources + totalTemplates}</div>\n`;
    summary += `<div style="color: #666;">Available Resources</div>\n`;
    summary += `</div>\n\n`;
    
    summary += `</div>\n\n`;
    
    return summary;
  }
  
  /**
   * Generate a markdown table for connection failures
   */
  private static generateFailuresTable(failedServers: ServerReport[]): string {
    let table = `| Server ID | Error |\n`;
    table += `| --- | --- |\n`;
    
    failedServers.forEach(server => {
      table += `| ${server.id} | ${server.error || 'Unknown error'} |\n`;
    });
    
    return table;
  }
  
  /**
   * Generate a bar chart showing server configurations
   */
  private static generateServerConfigDistribution(connectedServers: ServerReport[]): string {
    let chart = `\n\n### Server Configuration Overview\n\n`;
    
    // Create a mermaid bar chart for server capabilities
    chart += "```mermaid\n";
    chart += "%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#f0f0f0', 'lineColor': '#333333' }}}%%\n";
    chart += "graph TD\n";
    chart += `    title[<b>Server Configuration Distribution</b>]\n`;
    chart += `    style title fill:#f9f9f9,stroke:#ccc,stroke-width:1px\n\n`;
    
    // Add server nodes
    connectedServers.forEach((server, index) => {
      chart += `    S${index}[${server.id}] --> T${index}[Tools: ${server.capabilities.tools.length}]\n`;
      chart += `    S${index} --> R${index}[Resources: ${server.capabilities.resources.length}]\n`;
      chart += `    S${index} --> RT${index}[Templates: ${server.capabilities.resourceTemplates.length}]\n`;
      
      // Style the nodes
      chart += `    style S${index} fill:#e6f3ff,stroke:#0066cc,stroke-width:1px\n`;
      chart += `    style T${index} fill:#e6ffe6,stroke:#339933,stroke-width:1px\n`;
      chart += `    style R${index} fill:#f9e6ff,stroke:#993399,stroke-width:1px\n`;
      chart += `    style RT${index} fill:#fff2e6,stroke:#cc6600,stroke-width:1px\n`;
    });
    
    chart += "```\n\n";
    
    return chart;
  }
  
  /**
   * Generate visual summary cards for all connected servers
   */
  private static generateServerSummaryCards(connectedServers: ServerReport[]): string {
    if (connectedServers.length === 0) {
      return "*No connected servers.*\n\n";
    }
    
    let cards = '';
    
    // Create a grid layout with CSS-style boxes using markdown
    cards += `<div style="display: flex; flex-wrap: wrap; gap: 15px;">\n\n`;
    
    connectedServers.forEach(server => {
      const toolCount = server.capabilities.tools.length;
      const resourceCount = server.capabilities.resources.length;
      const templateCount = server.capabilities.resourceTemplates.length;
      
      // Create a styled card for each server
      cards += `<div style="flex: 1; min-width: 250px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f8f9fa;">\n\n`;
      
      // Server name as header
      cards += `<h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">🖥️ ${server.id}</h4>\n\n`;
      
      // Create progress bars for capability counts
      const maxCount = Math.max(toolCount, resourceCount, templateCount, 1);
      
      // Tools progress bar
      cards += `<div style="margin-bottom: 10px;">\n`;
      cards += `<strong>🔧 Tools:</strong> ${toolCount}\n`;
      cards += `<div style="width: 100%; background-color: #eee; height: 10px; border-radius: 5px; margin-top: 5px;">\n`;
      cards += `<div style="width: ${Math.min(100, (toolCount / maxCount) * 100)}%; background-color: #339933; height: 10px; border-radius: 5px;"></div>\n`;
      cards += `</div>\n`;
      cards += `</div>\n\n`;
      
      // Resources progress bar
      cards += `<div style="margin-bottom: 10px;">\n`;
      cards += `<strong>📦 Resources:</strong> ${resourceCount}\n`;
      cards += `<div style="width: 100%; background-color: #eee; height: 10px; border-radius: 5px; margin-top: 5px;">\n`;
      cards += `<div style="width: ${Math.min(100, (resourceCount / maxCount) * 100)}%; background-color: #993399; height: 10px; border-radius: 5px;"></div>\n`;
      cards += `</div>\n`;
      cards += `</div>\n\n`;
      
      // Templates progress bar
      cards += `<div style="margin-bottom: 10px;">\n`;
      cards += `<strong>📋 Templates:</strong> ${templateCount}\n`;
      cards += `<div style="width: 100%; background-color: #eee; height: 10px; border-radius: 5px; margin-top: 5px;">\n`;
      cards += `<div style="width: ${Math.min(100, (templateCount / maxCount) * 100)}%; background-color: #cc6600; height: 10px; border-radius: 5px;"></div>\n`;
      cards += `</div>\n`;
      cards += `</div>\n\n`;
      
      // End card
      cards += `</div>\n\n`;
    });
    
    // End grid layout
    cards += `</div>\n\n`;
    
    return cards;
  }
  
  /**
   * Format a list of tools into a comma-separated list of names
   */
  private static formatToolList(tools: ToolInfo[]): string {
    if (tools.length === 0) return "None";
    
    // Limit to first 5 with ellipsis for more
    const displayTools = tools.slice(0, 5);
    const moreIndicator = tools.length > 5 ? `, <i>+${tools.length - 5} more</i>` : '';
    
    return displayTools.map(tool => `<code>${tool.name}</code>`).join(', ') + moreIndicator;
  }
  
  /**
   * Format a list of resources into a comma-separated list of names
   */
  private static formatResourceList(resources: ResourceInfo[]): string {
    if (resources.length === 0) return "None";
    
    // Limit to first 3 with ellipsis for more
    const displayResources = resources.slice(0, 3);
    const moreIndicator = resources.length > 3 ? `, <i>+${resources.length - 3} more</i>` : '';
    
    return displayResources.map(res => `<code>${res.name}</code>`).join(', ') + moreIndicator;
  }
  
  /**
   * Format a list of resource templates into a comma-separated list of names
   */
  private static formatTemplateList(templates: ResourceTemplateInfo[]): string {
    if (templates.length === 0) return "None";
    
    // Limit to first 3 with ellipsis for more
    const displayTemplates = templates.slice(0, 3);
    const moreIndicator = templates.length > 3 ? `, <i>+${templates.length - 3} more</i>` : '';
    
    return displayTemplates.map(template => `<code>${template.name}</code>`).join(', ') + moreIndicator;
  }
  
  /**
   * Generate a markdown section for a server with enhanced formatting
   */
  private static generateServerSection(server: ServerReport): string {
    // Enhanced server header with better styling
    let section = `## ${server.id}\n\n`;
    
    // Add server metadata in a more structured way
    section += `<div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin-bottom: 20px;">\n\n`;
    section += `### Server Information\n\n`;
    section += `- **Server Type**: MCP Server\n`;
    section += `- **Command Path**: \`${server.config.command} ${server.config.args.join(' ')}\`\n`;
    if (server.connectionTime) {
      section += `- **Connection Time**: ${server.connectionTime}ms\n`;
    }
    section += `- **Environment Variables**: ${Object.keys(server.config.env || {}).length} configured\n`;
    section += `\n</div>\n\n`;
    
    // Generate capabilities overview
    const toolCount = server.capabilities.tools.length;
    const resourceCount = server.capabilities.resources.length;
    const templateCount = server.capabilities.resourceTemplates.length;
    
    // Add a visual dashboard of capability numbers
    section += `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">\n\n`;
    
    // Tools count card
    section += `<div style="flex: 1; min-width: 150px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    section += `<div style="text-align: center;">\n`;
    section += `<span style="font-size: 24px; font-weight: bold; color: #339933;">🔧 ${toolCount}</span>\n`;
    section += `<div style="color: #666;">Tools</div>\n`;
    section += `</div>\n`;
    section += `</div>\n\n`;
    
    // Resources count card
    section += `<div style="flex: 1; min-width: 150px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    section += `<div style="text-align: center;">\n`;
    section += `<span style="font-size: 24px; font-weight: bold; color: #993399;">📦 ${resourceCount}</span>\n`;
    section += `<div style="color: #666;">Resources</div>\n`;
    section += `</div>\n`;
    section += `</div>\n\n`;
    
    // Templates count card
    section += `<div style="flex: 1; min-width: 150px; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">\n`;
    section += `<div style="text-align: center;">\n`;
    section += `<span style="font-size: 24px; font-weight: bold; color: #cc6600;">📋 ${templateCount}</span>\n`;
    section += `<div style="color: #666;">Templates</div>\n`;
    section += `</div>\n`;
    section += `</div>\n\n`;
    
    section += `</div>\n\n`;
    
    // Generate visual distribution of capabilities if there are any
    if (toolCount > 0 || resourceCount > 0 || templateCount > 0) {
      section += `\n#### Capabilities Distribution\n\n`;
    }
    
    // Add tools section if available with enhanced styling
    if (server.capabilities.tools.length > 0) {
      section += `### 🔧 Available Tools (${server.capabilities.tools.length})\n\n`;
      section += this.generateToolsTable(server.capabilities.tools);
      section += `\n`;
      
      // Add detailed tool schemas in collapsible sections
      server.capabilities.tools.forEach(tool => {
        section += this.generateToolDetail(tool);
      });
    } else {
      section += `### 🔧 Tools\n\n`;
      section += `<div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 10px; color: #666;">\n`;
      section += `No tools available for this server.\n`;
      section += `</div>\n\n`;
    }
    
    // Add resources section if available with enhanced styling
    if (server.capabilities.resources.length > 0) {
      section += `### 📦 Direct Resources (${server.capabilities.resources.length})\n\n`;
      section += this.generateResourcesTable(server.capabilities.resources);
      section += `\n`;
    } else {
      section += `### 📦 Direct Resources\n\n`;
      section += `<div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 10px; color: #666;">\n`;
      section += `No direct resources available from this server.\n`;
      section += `</div>\n\n`;
    }
    
    // Add resource templates section if available with enhanced styling
    if (server.capabilities.resourceTemplates.length > 0) {
      section += `### 📋 Resource Templates (${server.capabilities.resourceTemplates.length})\n\n`;
      section += this.generateResourceTemplatesTable(server.capabilities.resourceTemplates);
      section += `\n`;
    } else {
      section += `### 📋 Resource Templates\n\n`;
      section += `<div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 10px; color: #666;">\n`;
      section += `No resource templates available from this server.\n`;
      section += `</div>\n\n`;
    }
    
    return section;
  }
  
  /**
   * Generate a markdown table for tools with enhanced styling
   */
  private static generateToolsTable(tools: ToolInfo[]): string {
    let table = `| Name | Description |\n`;
    table += `| --- | --- |\n`;
    
    tools.forEach(tool => {
      const description = tool.description || 'No description provided';
      table += `| \`${tool.name}\` | ${description} |\n`;
    });
    
    return table;
  }
  
  /**
   * Generate a detailed markdown section for a tool with consistent formatting
   */
  private static generateToolDetail(tool: ToolInfo): string {
    // Standardized tool details with consistent formatting for all tools
    let detail = `<details>\n<summary><strong>Tool: ${tool.name}</strong></summary>\n\n`;
    
    // Add description
    if (tool.description) {
      detail += `${tool.description}\n\n`;
      detail += `---\n\n`;
    }
    
    // Add input schema
    detail += `#### Input Schema\n\n`;
    detail += "```json\n";
    detail += JSON.stringify(tool.inputSchema, null, 2);
    detail += "\n```\n\n";
    
    // Add examples if available
    if (tool.examples && tool.examples.length > 0) {
      detail += `#### Examples\n\n`;
      tool.examples.forEach((example, index) => {
        detail += `**Example ${index + 1}**\n\n`;
        detail += `Input:\n`;
        detail += "```json\n";
        detail += JSON.stringify(example.in, null, 2);
        detail += "\n```\n\n";
        detail += `Output:\n`;
        detail += "```json\n";
        detail += JSON.stringify(example.out, null, 2);
        detail += "\n```\n\n";
      });
    }
    
    detail += `</details>\n\n`;
    return detail;
  }
  
  /**
   * Generate a markdown table for resources with enhanced styling
   */
  private static generateResourcesTable(resources: ResourceInfo[]): string {
    let table = `| URI | Name | Description | MIME Type |\n`;
    table += `| --- | --- | --- | --- |\n`;

    resources.forEach(resource => {
      const description = resource.description || 'No description provided';
      const mimeType = resource.mimeType || 'N/A';
      table += `| \`${resource.uri}\` | ${resource.name} | ${description} | ${mimeType} |\n`;
    });
    
    return table;
  }
  
  /**
   * Generate a markdown table for resource templates with enhanced styling
   */
  private static generateResourceTemplatesTable(templates: ResourceTemplateInfo[]): string {
    let table = `| URI Template | Name | Description | MIME Type |\n`;
    table += `| --- | --- | --- | --- |\n`;
    
    templates.forEach(template => {
      const description = template.description || 'No description provided';
      const mimeType = template.mimeType || 'N/A';
      table += `| \`${template.uriTemplate}\` | ${template.name} | ${description} | ${mimeType} |\n`;
    });
    
    return table;
  }
}