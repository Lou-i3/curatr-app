/**
 * Task system types
 *
 * Defines types for the unified task management system that handles
 * all long-running operations (scans, TMDB operations, etc.)
 */

/** Supported task types */
export type TaskType =
  | 'scan'
  | 'show-scan'
  | 'tmdb-bulk-match'
  | 'tmdb-refresh-missing'
  | 'tmdb-bulk-refresh'
  | 'tmdb-import'
  | 'ffprobe-analyze'
  | 'ffprobe-bulk-analyze';

/** Task execution status */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Error recorded during task execution */
export interface TaskError {
  item: string;
  error: string;
}

/** Base progress interface for all task types */
export interface BaseTaskProgress {
  taskId: string;
  type: TaskType;
  title?: string; // Custom title for display (e.g., "Scan: Arrow")
  status: TaskStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: TaskError[];
  startedAt: Date;
  completedAt?: Date;
}

/** Scan operation phases */
export type ScanPhase =
  | 'discovering'
  | 'parsing'
  | 'analyzing'
  | 'saving'
  | 'cleanup'
  | 'complete';

/** Scan-specific progress with additional fields */
export interface ScanTaskProgress extends BaseTaskProgress {
  type: 'scan' | 'show-scan';
  phase: ScanPhase;
  scanId: number;
  filesAdded: number;
  filesUpdated: number;
  filesDeleted: number;
}

/** TMDB operation progress (uses base progress) */
export interface TmdbTaskProgress extends BaseTaskProgress {
  type: 'tmdb-bulk-match' | 'tmdb-refresh-missing' | 'tmdb-bulk-refresh' | 'tmdb-import';
}

/** FFprobe analysis progress */
export interface FfprobeTaskProgress extends BaseTaskProgress {
  type: 'ffprobe-analyze';
  fileId: number; // The file being analyzed
}

/** Bulk FFprobe analysis progress (uses base progress) */
export interface FfprobeBulkTaskProgress extends BaseTaskProgress {
  type: 'ffprobe-bulk-analyze';
}

/** Union of all task progress types */
export type TaskProgress = ScanTaskProgress | TmdbTaskProgress | FfprobeTaskProgress | FfprobeBulkTaskProgress;

/** Serializable version of task progress for API responses */
export interface SerializedTaskProgress {
  taskId: string;
  type: TaskType;
  title?: string;
  status: TaskStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: TaskError[];
  startedAt: string;
  completedAt?: string;
  // Scan-specific fields
  phase?: ScanPhase;
  scanId?: number;
  filesAdded?: number;
  filesUpdated?: number;
  filesDeleted?: number;
  // FFprobe-specific fields
  fileId?: number;
}

/**
 * Convert task progress to serializable format
 * Accepts BaseTaskProgress to allow generic tracker usage
 */
export function serializeProgress(progress: BaseTaskProgress): SerializedTaskProgress {
  const base: SerializedTaskProgress = {
    taskId: progress.taskId,
    type: progress.type,
    title: progress.title,
    status: progress.status,
    total: progress.total,
    processed: progress.processed,
    succeeded: progress.succeeded,
    failed: progress.failed,
    currentItem: progress.currentItem,
    errors: progress.errors,
    startedAt: progress.startedAt.toISOString(),
    completedAt: progress.completedAt?.toISOString(),
  };

  // Add scan-specific fields if present
  if (progress.type === 'scan' || progress.type === 'show-scan') {
    const scanProgress = progress as ScanTaskProgress;
    base.phase = scanProgress.phase;
    base.scanId = scanProgress.scanId;
    base.filesAdded = scanProgress.filesAdded;
    base.filesUpdated = scanProgress.filesUpdated;
    base.filesDeleted = scanProgress.filesDeleted;
  }

  // Add ffprobe-specific fields if present
  if (progress.type === 'ffprobe-analyze') {
    const ffprobeProgress = progress as FfprobeTaskProgress;
    base.fileId = ffprobeProgress.fileId;
  }

  return base;
}
