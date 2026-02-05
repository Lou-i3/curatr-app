/**
 * Scanner configuration module
 * Handles environment variable validation and defaults
 */

import { access, constants } from 'fs/promises';

export interface ScannerConfig {
  tvShowsPath: string;
  moviesPath: string;
  ffprobePath: string;
  ffprobeTimeout: number;
  concurrency: number;
  batchSize: number;
}

let cachedConfig: ScannerConfig | null = null;

/**
 * Get scanner configuration from environment variables
 * @throws Error if required TV_SHOWS_PATH or MOVIES_PATH is not set
 */
export function getConfig(): ScannerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const tvShowsPath = process.env.TV_SHOWS_PATH;
  const moviesPath = process.env.MOVIES_PATH;
  
  if (!tvShowsPath && !moviesPath) {
    throw new Error(
      'At least one of TV_SHOWS_PATH or MOVIES_PATH environment variables is required.'
    );
  }

  cachedConfig = {
    tvShowsPath: tvShowsPath || '',
    moviesPath: moviesPath || '',
    ffprobePath: process.env.FFPROBE_PATH ?? '/usr/bin/ffprobe',
    ffprobeTimeout: parseInt(process.env.FFPROBE_TIMEOUT ?? '30000', 10),
    concurrency: parseInt(process.env.SCAN_CONCURRENCY ?? '4', 10),
    batchSize: parseInt(process.env.SCAN_BATCH_SIZE ?? '100', 10),
  };

  return cachedConfig;
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Validate that the scanner configuration is correct
 * Checks that paths exist and are accessible
 * @param options.skipFfprobe - Skip ffprobe validation (when metadata extraction is disabled)
 */
export async function validateConfig(options?: { skipFfprobe?: boolean }): Promise<void> {
  const config = getConfig();

  // Validate at least one media path exists and is readable
  let pathValid = false;
  const errors: string[] = [];

  if (config.tvShowsPath) {
    try {
      await access(config.tvShowsPath, constants.R_OK);
      pathValid = true;
    } catch {
      errors.push(`TV_SHOWS_PATH "${config.tvShowsPath}" does not exist or is not readable`);
    }
  }

  if (config.moviesPath) {
    try {
      await access(config.moviesPath, constants.R_OK);
      pathValid = true;
    } catch {
      errors.push(`MOVIES_PATH "${config.moviesPath}" does not exist or is not readable`);
    }
  }

  if (!pathValid) {
    throw new Error(
      `At least one media path must be valid. Errors:\n${errors.join('\n')}`
    );
  }

  // Validate ffprobe exists and is executable (only when needed)
  if (!options?.skipFfprobe && process.env.NODE_ENV === 'production') {
    try {
      await access(config.ffprobePath, constants.X_OK);
    } catch {
      throw new Error(
        `FFPROBE_PATH "${config.ffprobePath}" does not exist or is not executable. ` +
        `Install ffmpeg or set skipMetadata: true to skip metadata extraction.`
      );
    }
  }
}

/**
 * Get an empty metadata object (used when skipping ffprobe)
 */
export function getEmptyMetadata() {
  return {
    codec: null,
    resolution: null,
    bitrate: null,
    container: null,
    audioFormat: null,
    hdrType: null,
    duration: null,
    audioLanguages: [],
    subtitleLanguages: [],
  };
}
