#!/usr/bin/env node

/**
 * Clean Script
 * ============
 * 
 * Description:
 *   A utility script to clean build artifacts and temporary directories from your project.
 *   By default, it removes the 'dist' directory and cleans the contents of the 'logs' directory
 *   while preserving its structure.
 * 
 * Usage:
 *   - Add to package.json: "clean": "node dist/scripts/clean.js"
 *   - Can be run directly: npm run clean
 *   - Often used in rebuild scripts: "rebuild": "npm run clean && npm run build"
 *   - Can be used with arguments to specify custom directories: node dist/scripts/clean.js temp coverage
 *   - Special handling for 'logs': preserves directory structure but cleans contents
 * 
 * Platform compatibility:
 *   - Works on all platforms (Windows, macOS, Linux) using Node.js path normalization
 */

import { rm, access, readdir, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Interface for clean operation result
 */
interface CleanResult {
  dir: string;
  status: 'success' | 'skipped';
  reason?: string;
}

/**
 * Check if a directory exists without using fs.Stats
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean directory contents while preserving the directory structure
 * This will remove all files in the directory but keep subdirectories
 */
async function cleanDirectoryContents(dirPath: string): Promise<void> {
  try {
    // Check if directory exists
    const exists = await directoryExists(dirPath);
    if (!exists) {
      // Create the directory if it doesn't exist
      await mkdir(dirPath, { recursive: true });
      return;
    }

    // Read directory contents
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    // Process each entry
    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // For subdirectories, recursively clean their contents
        await cleanDirectoryContents(entryPath);
      } else {
        // For files, remove them
        await rm(entryPath, { force: true });
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Main clean function
 */
const clean = async (): Promise<void> => {
  try {
    // Default directories to clean
    let dirsToClean: string[] = ['dist', 'logs'];
    
    // If directories are specified as command line arguments, use those instead
    const args = process.argv.slice(2);
    if (args.length > 0) {
      dirsToClean = args;
    }
    
    console.log(`Cleaning directories: ${dirsToClean.join(', ')}`);

    // Process each directory
    const results = await Promise.allSettled(
      dirsToClean.map(async (dir): Promise<CleanResult> => {  
        const dirPath = join(process.cwd(), dir);
        
        try {
          // Check if directory exists before attempting to remove it
          const exists = await directoryExists(dirPath);
          
          if (!exists) {
            return { dir, status: 'skipped', reason: 'does not exist' };
          }
          
          // Special handling for logs directory - clean contents but preserve structure
          if (dir === 'logs') {
            await cleanDirectoryContents(dirPath);
            return { dir, status: 'success' };
          }
          
          // For other directories, remove them completely
          await rm(dirPath, { recursive: true, force: true });
          return { dir, status: 'success' };
        } catch (error) {
          throw error;
        }
      })
    );

    // Report results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { dir, status, reason } = result.value;
        if (status === 'success') {
          if (dir === 'logs') {
            console.log(`✓ Successfully cleaned contents of ${dir} directory while preserving structure`);
          } else {
            console.log(`✓ Successfully cleaned ${dir} directory`);
          }
        } else {
          console.log(`- ${dir} directory ${reason}, skipping cleanup`);
        }
      } else {
        console.error(`× Error cleaning directory: ${result.reason}`);
      }
    }
  } catch (error) {
    console.error('× Error during cleanup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// Execute the clean function
clean();