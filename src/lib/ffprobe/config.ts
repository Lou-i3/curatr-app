/**
 * FFprobe configuration module
 * Handles path configuration, availability checking, and version detection
 */

import { access, constants } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface FFprobeConfig {
  path: string;
  timeout: number;
}

/**
 * Get FFprobe configuration from environment variables
 * NOT cached - reads env vars fresh each time for dev mode compatibility
 */
export function getFFprobeConfig(): FFprobeConfig {
  return {
    path: process.env.FFPROBE_PATH || '',
    timeout: parseInt(process.env.FFPROBE_TIMEOUT || '30000', 10),
  };
}

/**
 * Check if FFprobe is configured via environment variable
 */
export function isFFprobeConfigured(): boolean {
  return !!process.env.FFPROBE_PATH;
}

/**
 * Check if FFprobe binary is available and executable
 * NOT cached - checks fresh each time
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  const config = getFFprobeConfig();
  if (!config.path) return false;

  try {
    await access(config.path, constants.X_OK);
    // Also verify it actually runs
    await execFileAsync(config.path, ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get FFprobe version string
 * Returns null if FFprobe is not available
 */
export async function getFFprobeVersion(): Promise<string | null> {
  const config = getFFprobeConfig();
  if (!config.path) return null;

  try {
    const { stdout } = await execFileAsync(config.path, ['-version'], {
      timeout: 5000,
    });
    const match = stdout.match(/ffprobe version (\S+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Get detailed FFprobe status for diagnostics
 */
export async function getFFprobeDetailedStatus(): Promise<{
  configured: boolean;
  path: string;
  available: boolean;
  version: string | null;
  error: string | null;
}> {
  const configured = isFFprobeConfigured();
  const path = process.env.FFPROBE_PATH || '';

  if (!configured) {
    return {
      configured: false,
      path: '',
      available: false,
      version: null,
      error: null,
    };
  }

  try {
    await access(path, constants.X_OK);
  } catch {
    return {
      configured: true,
      path,
      available: false,
      version: null,
      error: `File not found or not executable: ${path}`,
    };
  }

  try {
    const { stdout } = await execFileAsync(path, ['-version'], { timeout: 5000 });
    const match = stdout.match(/ffprobe version (\S+)/);
    return {
      configured: true,
      path,
      available: true,
      version: match ? match[1] : null,
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      path,
      available: false,
      version: null,
      error: `FFprobe execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
