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
  BatchItem,
} from './types';
import { getConfig, getShowFolderPath, validateConfig, type ScannerConfig } from './config';
import { discoverFiles } from './filesystem';
import { parseFilename } from './parser';
import {
  markMissingFilesAsDeleted,
  markShowFilesAsDeleted,
  createScanHistory,
  updateScanHistory,
  BatchProcessor,
} from './database';
import {
  ScanProgressTracker,
  activeScanners,
  removeProgressTracker,
} from './progress';
import { ensureSettingsLoaded } from '@/lib/tasks';

/** Track cancelled scans */
const cancelledScans = new Set<number>();

/** Yield to event loop to keep app responsive */
const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** Batch size for database operations */
const BATCH_SIZE = 100;

/** How often to yield during discovery (every N files) */
const YIELD_INTERVAL = 10;

/** Result of starting a scan */
export interface StartScanResult {
  scanId: number;
  taskId: string;
}

/**
 * Start a new scan operation
 *
 * @param options - Scan configuration options
 * @returns Scan ID and Task ID for tracking progress
 */
export async function startScan(options: ScanOptions = {}): Promise<StartScanResult> {
  // Ensure task queue settings are loaded from DB
  await ensureSettingsLoaded();

  // Validate configuration
  const config = getConfig();

  // Create scan history record
  const scanType = options.targetShowId ? 'show-scan' : (options.scanType ?? 'full');
  const scanId = await createScanHistory(scanType);

  // Create progress tracker (also registers with task system)
  const taskType = options.targetShowId ? 'show-scan' : 'scan';
  const tracker = new ScanProgressTracker(scanId, options.targetShowTitle, taskType);
  activeScanners.set(scanId, tracker);
  const taskId = tracker.getTaskId();

  // Start scan in background (don't await)
  runScan(scanId, config, options, tracker).catch((error) => {
    console.error(`Scan ${scanId} failed:`, error);
    tracker.fail(error.message || 'Unknown error');
  });

  return { scanId, taskId };
}

/**
 * Run the scan operation
 * This is called in the background after startScan returns
 */
async function runScan(
  scanId: number,
  config: ScannerConfig,
  options: ScanOptions,
  tracker: ScanProgressTracker
): Promise<ScanResult> {

  const errors: ScanError[] = [];
  const stats: ScanStats = {
    filesScanned: 0,
    filesAdded: 0,
    filesUpdated: 0,
    filesDeleted: 0,
  };
  const existingFilepaths = new Set<string>();

  try {
    // Phase 1: Discover files
    tracker.setPhase('discovering');
    const files: DiscoveredFile[] = [];

    if (options.targetFolderName) {
      // Single-show sync - only scan target folder
      const showPath = getShowFolderPath(options.targetFolderName);
      if (!showPath) {
        throw new Error('TV shows path not configured');
      }

      let discoveryCount = 0;
      for await (const file of discoverFiles(showPath)) {
        if (cancelledScans.has(scanId)) {
          throw new Error('Scan cancelled by user');
        }

        files.push(file);
        existingFilepaths.add(file.filepath);

        if (++discoveryCount % YIELD_INTERVAL === 0) {
          await yieldToEventLoop();
        }
      }
    } else {
      // Full library scan - validate config and scan all directories
      await validateConfig({ skipFfprobe: options.skipMetadata });

      // Scan TV shows directory
      if (config.tvShowsPath) {
        let discoveryCount = 0;
        for await (const file of discoverFiles(config.tvShowsPath)) {
          if (cancelledScans.has(scanId)) {
            throw new Error('Scan cancelled by user');
          }

          files.push(file);
          existingFilepaths.add(file.filepath);

          if (++discoveryCount % YIELD_INTERVAL === 0) {
            await yieldToEventLoop();
          }
        }
      }

      // Scan movies directory
      if (config.moviesPath) {
        let discoveryCount = 0;
        for await (const file of discoverFiles(config.moviesPath)) {
          if (cancelledScans.has(scanId)) {
            throw new Error('Scan cancelled by user');
          }

          files.push(file);
          existingFilepaths.add(file.filepath);

          if (++discoveryCount % YIELD_INTERVAL === 0) {
            await yieldToEventLoop();
          }
        }
      }
    }

    tracker.setTotalFiles(files.length);

    // Phase 2: Parse all filenames first
    tracker.setPhase('parsing');
    const batchItems: BatchItem[] = [];

    for (const file of files) {
      // Check for cancellation
      if (cancelledScans.has(scanId)) {
        throw new Error('Scan cancelled by user');
      }

      const parsed = parseFilename(file.filepath);

      if (!parsed) {
        errors.push({
          filepath: file.filepath,
          error: 'Unable to parse filename - could not extract show/season/episode',
          phase: 'parsing',
        });
        tracker.addError(errors[errors.length - 1]);
        continue;
      }

      batchItems.push({ parsed, file });
    }

    // Yield before heavy DB work
    await yieldToEventLoop();

    // Phase 3: Initialize batch processor and process in batches
    tracker.setPhase('saving');
    const batchProcessor = new BatchProcessor();
    await batchProcessor.initialize();

    // Process in batches for better performance
    let processedCount = 0;
    for (let i = 0; i < batchItems.length; i += BATCH_SIZE) {
      // Check for cancellation
      if (cancelledScans.has(scanId)) {
        throw new Error('Scan cancelled by user');
      }

      const batch = batchItems.slice(i, i + BATCH_SIZE);

      try {
        const batchResult = await batchProcessor.processBatch(batch);
        stats.filesAdded += batchResult.filesAdded;
        stats.filesUpdated += batchResult.filesUpdated;
        stats.filesScanned += batch.length;
        processedCount += batch.length;

        // Update progress with last file in batch
        tracker.setProcessedFiles(processedCount, batch[batch.length - 1].file.filepath);
      } catch (error) {
        // If batch fails, record error for all files in batch
        const errorMessage = error instanceof Error ? error.message : String(error);
        for (const item of batch) {
          errors.push({
            filepath: item.file.filepath,
            error: errorMessage,
            phase: 'saving',
          });
          tracker.addError(errors[errors.length - 1]);
        }
        processedCount += batch.length;
        tracker.setProcessedFiles(processedCount, batch[batch.length - 1].file.filepath);
      }

      // Yield after each batch to keep app responsive
      await yieldToEventLoop();
    }

    // Phase 4: Mark deleted files
    tracker.setPhase('cleanup');
    if (options.targetShowId) {
      // Single-show sync - only mark files for this show as deleted
      stats.filesDeleted = await markShowFilesAsDeleted(options.targetShowId, existingFilepaths);
    } else {
      // Full scan - mark all missing files as deleted
      stats.filesDeleted = await markMissingFilesAsDeleted(existingFilepaths);
    }

    // Update final stats on tracker
    tracker.updateStats({
      filesAdded: stats.filesAdded,
      filesUpdated: stats.filesUpdated,
      filesDeleted: stats.filesDeleted,
    });

    // Complete
    tracker.complete();

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

    // Mark tracker as cancelled or failed
    const wasCancelled = cancelledScans.has(scanId);
    if (wasCancelled) {
      tracker.cancel();
    } else {
      tracker.fail(errorMessage);
    }

    await updateScanHistory(scanId, {
      status: wasCancelled ? ScanStatus.CANCELLED : ScanStatus.FAILED,
      completedAt: new Date(),
      filesScanned: stats.filesScanned,
      filesAdded: stats.filesAdded,
      filesUpdated: stats.filesUpdated,
      filesDeleted: stats.filesDeleted,
      errors: wasCancelled
        ? (errors.length > 0 ? JSON.stringify(errors) : undefined)
        : JSON.stringify([
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
