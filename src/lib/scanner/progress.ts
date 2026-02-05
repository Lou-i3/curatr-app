/**
 * Progress tracking module for scan operations
 *
 * Provides real-time progress updates via subscriber pattern
 */

import type { ScanProgress, ScanPhase, ScanError } from './types';

/**
 * Progress tracker for a single scan operation
 */
export class ScanProgressTracker {
  private progress: ScanProgress;
  private subscribers = new Set<(progress: ScanProgress) => void>();

  constructor(scanId: number) {
    this.progress = {
      scanId,
      phase: 'discovering',
      totalFiles: 0,
      processedFiles: 0,
      errors: [],
    };
  }

  /** Get current progress state */
  getProgress(): ScanProgress {
    return { ...this.progress };
  }

  /** Set the current scan phase */
  setPhase(phase: ScanPhase): void {
    this.progress.phase = phase;
    this.notify();
  }

  /** Set total files to process */
  setTotalFiles(total: number): void {
    this.progress.totalFiles = total;
    this.notify();
  }

  /** Increment processed count */
  incrementProcessed(filepath?: string): void {
    this.progress.processedFiles++;
    this.progress.currentFile = filepath;
    this.notify();
  }

  /** Add an error */
  addError(error: ScanError): void {
    this.progress.errors.push(error);
    this.notify();
  }

  /** Subscribe to progress updates */
  subscribe(callback: (progress: ScanProgress) => void): () => void {
    this.subscribers.add(callback);
    // Send current state immediately
    callback(this.getProgress());
    // Return unsubscribe function
    return () => this.subscribers.delete(callback);
  }

  /** Notify all subscribers of progress change */
  private notify(): void {
    const progress = this.getProgress();
    for (const subscriber of this.subscribers) {
      subscriber(progress);
    }
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
  activeScanners.delete(scanId);
}

/**
 * Check if a scan is currently running
 */
export function isScanRunning(scanId: number): boolean {
  return activeScanners.has(scanId);
}
