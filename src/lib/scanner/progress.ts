/**
 * Scanner progress tracking module
 *
 * Provides backward-compatible interface for scan progress tracking
 * while using the unified task system internally.
 */

import type { ScanProgress, ScanPhase, ScanError } from './types';
import {
  TaskProgressTracker,
  createScanTask,
  removeTask,
  getTaskTracker,
  type ScanTaskProgress,
} from '@/lib/tasks';

/** Maps scanId (number) to taskId (string) for backward compatibility */
const scanIdToTaskId = new Map<number, string>();

/**
 * Progress tracker for a single scan operation
 *
 * This is a wrapper around TaskProgressTracker that maintains the old API
 * for backward compatibility with existing scan code.
 */
export class ScanProgressTracker {
  private tracker: TaskProgressTracker<ScanTaskProgress>;
  private scanId: number;

  constructor(scanId: number) {
    this.scanId = scanId;
    this.tracker = createScanTask(scanId);
    scanIdToTaskId.set(scanId, this.tracker.getTaskId());
  }

  /** Get the task ID for the unified task system */
  getTaskId(): string {
    return this.tracker.getTaskId();
  }

  /** Get current progress state in legacy format */
  getProgress(): ScanProgress {
    const p = this.tracker.getProgress();
    return {
      scanId: p.scanId,
      phase: p.phase,
      totalFiles: p.total,
      processedFiles: p.processed,
      currentFile: p.currentItem,
      errors: p.errors.map((e) => ({
        filepath: e.item,
        error: e.error,
        phase: 'saving' as ScanPhase, // Default phase for errors
      })),
    };
  }

  /** Set the current scan phase */
  setPhase(phase: ScanPhase): void {
    this.tracker.update({ phase });
  }

  /** Set total files to process */
  setTotalFiles(total: number): void {
    this.tracker.setTotal(total);
  }

  /** Increment processed count */
  incrementProcessed(filepath?: string): void {
    const p = this.tracker.getProgress();
    this.tracker.update({
      processed: p.processed + 1,
      succeeded: p.succeeded + 1,
      currentItem: filepath,
    });
  }

  /** Set processed count directly (for batch processing) */
  setProcessedFiles(count: number, filepath?: string): void {
    this.tracker.update({
      processed: count,
      succeeded: count,
      currentItem: filepath,
    });
  }

  /** Add an error */
  addError(error: ScanError): void {
    this.tracker.incrementFailed(error.filepath, error.error);
  }

  /** Update scan stats */
  updateStats(stats: { filesAdded?: number; filesUpdated?: number; filesDeleted?: number }): void {
    this.tracker.update(stats);
  }

  /** Subscribe to progress updates (legacy format) */
  subscribe(callback: (progress: ScanProgress) => void): () => void {
    return this.tracker.subscribe((p) => {
      callback({
        scanId: p.scanId,
        phase: p.phase,
        totalFiles: p.total,
        processedFiles: p.processed,
        currentFile: p.currentItem,
        errors: p.errors.map((e) => ({
          filepath: e.item,
          error: e.error,
          phase: 'saving' as ScanPhase,
        })),
      });
    });
  }

  /** Mark scan as complete */
  complete(): void {
    this.tracker.update({ phase: 'complete' });
    this.tracker.complete();
  }

  /** Mark scan as failed */
  fail(error: string): void {
    this.tracker.fail(error);
  }

  /** Mark scan as cancelled */
  cancel(): void {
    this.tracker.cancel();
  }

  /** Convert to JSON for API responses */
  toJSON(): ScanProgress {
    return this.getProgress();
  }
}

/** Global registry of active scans for progress tracking */
export const activeScanners = new Map<number, ScanProgressTracker>();

/**
 * Get or create a progress tracker for a scan
 */
export function getProgressTracker(scanId: number): ScanProgressTracker {
  let tracker = activeScanners.get(scanId);
  if (!tracker) {
    tracker = new ScanProgressTracker(scanId);
    activeScanners.set(scanId, tracker);
  }
  return tracker;
}

/**
 * Remove a progress tracker (when scan completes)
 */
export function removeProgressTracker(scanId: number): void {
  const tracker = activeScanners.get(scanId);
  if (tracker) {
    // Keep in task system for a bit for final status fetches
    setTimeout(() => {
      const taskId = scanIdToTaskId.get(scanId);
      if (taskId) {
        removeTask(taskId);
        scanIdToTaskId.delete(scanId);
      }
    }, 60000);
  }
  activeScanners.delete(scanId);
}

/**
 * Check if a scan is currently running
 */
export function isScanRunning(scanId: number): boolean {
  return activeScanners.has(scanId);
}

/**
 * Get task ID for a scan ID
 */
export function getTaskIdForScan(scanId: number): string | undefined {
  return scanIdToTaskId.get(scanId);
}

/**
 * Get scan progress tracker by task ID
 */
export function getScanTrackerByTaskId(taskId: string): ScanProgressTracker | undefined {
  for (const [scanId, tracker] of activeScanners) {
    if (tracker.getTaskId() === taskId) {
      return tracker;
    }
  }
  return undefined;
}
