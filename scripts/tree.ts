#!/usr/bin/env node

/**
 * Generate Tree Script
 * ===================
 * 
 * Description:
 *   A utility script that generates a visual tree representation of your project's directory structure.
 *   The script respects .gitignore patterns and applies common exclusions like node_modules.
 *   The tree is saved as a markdown file by default in the docs directory.
 * 
 * Usage:
 *   - Add to package.json: "tree": "node dist/scripts/generate-tree.js"
 *   - Run directly: npm run tree
 *   - Specify custom output path: node dist/scripts/generate-tree.js ./documentation/structure.md
 *   - Specify max depth: node dist/scripts/generate-tree.js --depth=3
 *   - Get help: node dist/scripts/generate-tree.js --help
 * 
 * Features:
 *   - Automatically excludes directories listed in .gitignore
 *   - Handles directory sorting (folders first)
 *   - Supports custom output path
 *   - Works on all platforms
 *   - Can limit directory depth
 */

import fs from 'fs/promises';
import path from 'path';

// Process command line arguments
const args = process.argv.slice(2);
let outputPath = 'docs/tree.md';
let maxDepth = Infinity;

/**
 * Interface for gitignore pattern
 */
interface GitignorePattern {
  pattern: string;
  negated: boolean;
  regex: string;
}

// Handle command line options
if (args.includes('--help')) {
  console.log(`
Generate Tree - Project directory structure visualization tool

Usage:
  node dist/scripts/generate-tree.js [output-path] [--depth=<number>] [--help]

Options:
  output-path      Custom file path for the tree output (default: docs/tree.md)
  --depth=<number> Maximum directory depth to display (default: unlimited)
  --help           Show this help message
`);
  process.exit(0);
}

// Default patterns to always ignore
const DEFAULT_IGNORE_PATTERNS: string[] = ['.git', 'node_modules', '.DS_Store', 'dist', 'build'];

/**
 * Loads patterns from the .gitignore file
 */
async function loadGitignorePatterns(): Promise<GitignorePattern[]> {
  try {
    const gitignoreContent = await fs.readFile('.gitignore', 'utf-8');
    return gitignoreContent
      .split('\n')
      .map(line => line.trim())
      // Remove comments, empty lines, and lines with just whitespace
      .filter(line => line && !line.startsWith('#') && line.trim() !== '')
      // Process each pattern
      .map(pattern => ({
        pattern: pattern.startsWith('!') ? pattern.slice(1) : pattern,
        negated: pattern.startsWith('!'),
        // Convert glob patterns to regex-compatible strings (simplified approach)
        regex: pattern
          .replace(/\./g, '\\.') // Escape dots first
          .replace(/\*/g, '.*')  // Convert * to .*
          .replace(/\?/g, '.')   // Convert ? to .
          .replace(/\/$/, '(/.*)?') // Handle directory indicators
      }));
  } catch (error) {
    console.warn('No .gitignore file found, using default patterns only');
    return [];
  }
}

/**
 * Checks if a path should be ignored based on patterns
 */
function isIgnored(entryPath: string, ignorePatterns: GitignorePattern[]): boolean {
  // Always check default patterns first
  if (DEFAULT_IGNORE_PATTERNS.some(pattern => entryPath.includes(pattern))) {
    return true;
  }

  let ignored = false;
  for (const { pattern, negated, regex } of ignorePatterns) {
    // Convert the pattern to a proper regex
    const regexPattern = new RegExp(`^${regex}$|/${regex}$|/${regex}/`);
    
    if (regexPattern.test(entryPath)) {
      // If it's a negation pattern (!pattern), this file should NOT be ignored
      // Otherwise, it should be ignored
      ignored = !negated;
    }
  }
  
  return ignored;
}

/**
 * Generates a tree representation of the directory structure
 */
async function generateTree(
  dir: string, 
  ignorePatterns: GitignorePattern[], 
  prefix = '', 
  isLast = true, 
  relativePath = '', 
  currentDepth = 0
): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let output = '';

  // Filter and sort entries
  const filteredEntries = entries
    .filter(entry => {
      const entryPath = path.join(relativePath, entry.name);
      return !isIgnored(entryPath, ignorePatterns);
    })
    .sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (let i = 0; i < filteredEntries.length; i++) {
    const entry = filteredEntries[i];
    const isLastEntry = i === filteredEntries.length - 1;
    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    const newRelativePath = path.join(relativePath, entry.name);
    
    output += prefix + (isLastEntry ? '└── ' : '├── ') + entry.name + '\n';

    // Only traverse deeper if we haven't reached maxDepth
    if (entry.isDirectory() && currentDepth < maxDepth) {
      output += await generateTree(
        path.join(dir, entry.name),
        ignorePatterns,
        newPrefix,
        isLastEntry,
        newRelativePath,
        currentDepth + 1
      );
    }
  }

  return output;
}

// Process command line arguments for custom configurations
for (const arg of args) {
  if (arg.startsWith('--depth=')) {
    const depthValue = arg.split('=')[1];
    const parsedDepth = parseInt(depthValue, 10);
    
    if (isNaN(parsedDepth) || parsedDepth < 1) {
      console.error('Invalid depth value. Using unlimited depth.');
      maxDepth = Infinity;
    } else {
      maxDepth = parsedDepth;
    }
  } else if (!arg.startsWith('--')) {
    // If it's not an option flag, assume it's the output path
    outputPath = arg;
  }
}

/**
 * Main function to write the tree to a file
 */
const writeTree = async (): Promise<void> => {
  try {
    const rootDir = process.cwd();
    const projectName = path.basename(rootDir);
    const ignorePatterns = await loadGitignorePatterns();
    
    console.log(`Generating directory tree for: ${projectName}`);
    console.log(`Output path: ${outputPath}`);
    if (maxDepth !== Infinity) {
      console.log(`Maximum depth: ${maxDepth}`);
    }
    
    // Generate the tree structure
    const treeContent = await generateTree(rootDir, ignorePatterns, '', true, '', 0);
    
    // Ensure output directory exists
    const outputDir = path.dirname(path.resolve(rootDir, outputPath));
    try {
      await fs.access(outputDir);
    } catch {
      console.log(`Creating directory: ${outputDir}`);
      await fs.mkdir(outputDir, { recursive: true });
    }

    // Write tree to file
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    const content = `# ${projectName} - Directory Structure

Generated on: ${timestamp}

${maxDepth !== Infinity ? `_Depth limited to ${maxDepth} levels_\n\n` : ''}
\`\`\`
${projectName}
${treeContent}
\`\`\`

_Note: This tree excludes files and directories matched by .gitignore and common patterns like node_modules._
`;

    await fs.writeFile(
      path.resolve(rootDir, outputPath),
      content
    );
    
    console.log(`✓ Successfully generated tree structure in ${outputPath}`);
  } catch (error) {
    console.error(`× Error generating tree: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};

// Execute the write tree function
writeTree();