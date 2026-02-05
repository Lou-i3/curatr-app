/**
 * Main scan orchestrator
 *
 * Coordinates the full scanning workflow:
 * 1. Discover files
 * 2. Parse filenames
 * 3. Create database hierarchy
 * 4. Track deleted files
 */

import { ScanStatus } from '@/generated/prisma/client';
import type {
  ScanOptions,
  ScanResult,
  ScanStats,
  ScanError,
  DiscoveredFile,
} from './types';
import { getConfig, validateConfig, getEmptyMetadata, type ScannerConfig } from './config';
import { discoverFiles } from './filesystem';
import { parseFilename } from './parser';
import {
  findOrCreateHierarchy,
  upsertEpisodeFile,
  markMissingFilesAsDeleted,
  createScanHistory,
  updateScanHistory,
} from './database';
import {
  ScanProgressTracker,
  activeScanners,
  removeProgressTracker,
} from './progress';

/** Track cancelled scans */
const cancelledScans = new Set<number>();

/**
 * Start a new scan operation
 *
 * @param options - Scan configuration options
 * @returns Scan ID that can be used to track progress
 */
export async function startScan(options: ScanOptions = {}): Promise<number> {
  // Validate configuration
  const config = getConfig();

  // Create scan history record
  const scanType = options.scanType ?? 'full';
  const scanId = await createScanHistory(scanType);

  // Start scan in background (don't await)
  runScan(scanId, config, options).catch((error) => {
    console.error(`Scan ${scanId} failed:`, error);
  });

  return scanId;
}

/**
 * Run the scan operation
 * This is called in the background after startScan returns
 */
async function runScan(
  scanId: number,
  config: ScannerConfig,
  options: ScanOptions
): Promise<ScanResult> {
  const tracker = new ScanProgressTracker(scanId);
  activeScanners.set(scanId, tracker);

  const errors: ScanError[] = [];
  const stats: ScanStats = {
    filesScanned: 0,
    filesAdded: 0,
    filesUpdated: 0,
    filesDeleted: 0,
  };
  const existingFilepaths = new Set<string>();

  try {
    // Validate media path is accessible (skip ffprobe check if not extracting metadata)
    await validateConfig({ skipFfprobe: options.skipMetadata });

    // Phase 1: Discover files from both TV shows and movies directories
    tracker.setPhase('discovering');
    const files: DiscoveredFile[] = [];

    // Scan TV shows directory
    if (config.tvShowsPath) {
      for await (const file of discoverFiles(config.tvShowsPath)) {
        // Check for cancellation
        if (cancelledScans.has(scanId)) {
          throw new Error('Scan cancelled by user');
        }

        files.push(file);
        existingFilepaths.add(file.filepath);
      }
    }

    // Scan movies directory
    if (config.moviesPath) {
      for await (const file of discoverFiles(config.moviesPath)) {
        // Check for cancellation
        if (cancelledScans.has(scanId)) {
          throw new Error('Scan cancelled by user');
        }

        files.push(file);
        existingFilepaths.add(file.filepath);
      }
    }

    tracker.setTotalFiles(files.length);

    // Phase 2 & 3: Parse and save to database
    tracker.setPhase('parsing');

    for (const file of files) {
      // Check for cancellation
      if (cancelledScans.has(scanId)) {
        throw new Error('Scan cancelled by user');
      }

      try {
        // Parse filename
        const parsed = parseFilename(file.filepath);

        if (!parsed) {
          errors.push({
            filepath: file.filepath,
            error: 'Unable to parse filename - could not extract show/season/episode',
            phase: 'parsing',
          });
          tracker.addError(errors[errors.length - 1]);
          tracker.incrementProcessed(file.filepath);
          continue;
        }

        // Create hierarchy
        tracker.setPhase('saving');
        const hierarchy = await findOrCreateHierarchy(parsed);

        // Create/update file record (without metadata for now)
        const metadata = options.skipMetadata ? null : getEmptyMetadata();
        const result = await upsertEpisodeFile(
          hierarchy.episodeId,
          file,
          metadata
        );

        if (result === 'created') {
          stats.filesAdded++;
        } else if (result === 'updated') {
          stats.filesUpdated++;
        }

        stats.filesScanned++;
        tracker.incrementProcessed(file.filepath);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          filepath: file.filepath,
          error: errorMessage,
          phase: tracker.getProgress().phase,
        });
        tracker.addError(errors[errors.length - 1]);
        tracker.incrementProcessed(file.filepath);
      }
    }

    // Phase 4: Mark deleted files
    tracker.setPhase('cleanup');
    stats.filesDeleted = await markMissingFilesAsDeleted(existingFilepaths);

    // Complete
    tracker.setPhase('complete');

    await updateScanHistory(scanId, {
      status: ScanStatus.COMPLETED,
      completedAt: new Date(),
      filesScanned: stats.filesScanned,
      filesAdded: stats.filesAdded,
      filesUpdated: stats.filesUpdated,
      filesDeleted: stats.filesDeleted,
      errors: errors.length > 0 ? JSON.stringify(errors) : undefined,
    });

    return { success: true, scanId, stats, errors };
  } catch (error) {
    // Fatal error - mark scan as failed
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await updateScanHistory(scanId, {
      status: ScanStatus.FAILED,
      completedAt: new Date(),
      filesScanned: stats.filesScanned,
      filesAdded: stats.filesAdded,
      filesUpdated: stats.filesUpdated,
      filesDeleted: stats.filesDeleted,
      errors: JSON.stringify([
        ...errors,
        { filepath: '', error: errorMessage, phase: 'fatal' as const },
      ]),
    });

    return {
      success: false,
      scanId,
      stats,
      errors: [
        ...errors,
        { filepath: '', error: errorMessage, phase: 'fatal' as const },
      ],
    };
  } finally {
    // Clean up
    removeProgressTracker(scanId);
    cancelledScans.delete(scanId);
  }
}

/**
 * Cancel a running scan
 */
export function cancelScan(scanId: number): boolean {
  if (activeScanners.has(scanId)) {
    cancelledScans.add(scanId);
    return true;
  }
  return false;
}

/**
 * Check if a scan is currently running
 */
export function isScanActive(scanId: number): boolean {
  return activeScanners.has(scanId);
}

/**
 * Get progress tracker for a running scan
 */
export function getScanProgress(scanId: number): ScanProgressTracker | null {
  return activeScanners.get(scanId) ?? null;
}
