/**
 * Task progress tracking module
 *
 * Provides real-time progress updates via subscriber pattern.
 * Supports task queuing with configurable max parallel tasks.
 */

import { randomUUID } from 'crypto';
import type {
  BaseTaskProgress,
  ScanTaskProgress,
  TmdbTaskProgress,
  FfprobeTaskProgress,
  SerializedTaskProgress,
} from './types';
import { serializeProgress } from './types';
import { DEFAULT_MAX_PARALLEL_TASKS } from '@/lib/settings-shared';

/**
 * Generic task progress tracker
 *
 * Tracks progress for any task type and notifies subscribers of updates.
 */
export class TaskProgressTracker<T extends BaseTaskProgress = BaseTaskProgress> {
  private progress: T;
  private subscribers = new Set<(progress: T) => void>();

  constructor(initialProgress: T) {
    this.progress = initialProgress;
  }

  /** Get the task ID */
  getTaskId(): string {
    return this.progress.taskId;
  }

  /** Get current progress state (copy) */
  getProgress(): T {
    return { ...this.progress };
  }

  /** Get serialized progress for API responses */
  getSerialized(): SerializedTaskProgress {
    return serializeProgress(this.progress);
  }

  /** Update progress with partial values */
  update(partial: Partial<T>): void {
    Object.assign(this.progress, partial);
    this.notify();
  }

  /** Set total items to process */
  setTotal(total: number): void {
    this.progress.total = total;
    this.notify();
  }

  /** Set current item being processed */
  setCurrentItem(item: string): void {
    this.progress.currentItem = item;
    this.notify();
  }

  /** Record a successful item */
  incrementSuccess(item?: string): void {
    this.progress.processed++;
    this.progress.succeeded++;
    if (item) this.progress.currentItem = item;
    this.notify();
  }

  /** Record a failed item */
  incrementFailed(item: string, error: string): void {
    this.progress.processed++;
    this.progress.failed++;
    this.progress.errors.push({ item, error });
    this.progress.currentItem = item;
    this.notify();
  }

  /** Mark task as running (from pending/queued state) */
  start(): void {
    this.progress.status = 'running';
    this.progress.startedAt = new Date();
    this.notify();
  }

  /** Mark task as completed */
  complete(): void {
    this.progress.status = 'completed';
    this.progress.completedAt = new Date();
    this.notify();
    onTaskComplete(this.getTaskId());
  }

  /** Mark task as failed */
  fail(error: string): void {
    this.progress.status = 'failed';
    this.progress.completedAt = new Date();
    this.progress.errors.push({ item: '', error });
    this.notify();
    onTaskComplete(this.getTaskId());
  }

  /** Mark task as cancelled */
  cancel(): void {
    this.progress.status = 'cancelled';
    this.progress.completedAt = new Date();
    this.notify();
    onTaskComplete(this.getTaskId());
  }

  /** Subscribe to progress updates */
  subscribe(callback: (progress: T) => void): () => void {
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
}

/** Queue item type */
interface QueuedTask {
  taskId: string;
  run: () => Promise<void>;
}

/** Global state interface for task system */
interface TaskGlobalState {
  activeTasks: Map<string, TaskProgressTracker<BaseTaskProgress>>;
  cancelledTasks: Set<string>;
  taskQueue: QueuedTask[];
  maxParallelTasks: number;
  settingsLoaded: boolean;
}

/** Symbol key for global state to avoid collisions */
const TASK_STATE_KEY = Symbol.for('media-quality-tracker.taskState');

/** Get or create the global task state (survives module reloads) */
function getGlobalState(): TaskGlobalState {
  const globalObj = globalThis as typeof globalThis & { [TASK_STATE_KEY]?: TaskGlobalState };

  if (!globalObj[TASK_STATE_KEY]) {
    globalObj[TASK_STATE_KEY] = {
      activeTasks: new Map<string, TaskProgressTracker<BaseTaskProgress>>(),
      cancelledTasks: new Set<string>(),
      taskQueue: [],
      maxParallelTasks: DEFAULT_MAX_PARALLEL_TASKS,
      settingsLoaded: false,
    };
  }

  return globalObj[TASK_STATE_KEY];
}

/** Global registry of active tasks (singleton across module reloads) */
export const activeTasks = getGlobalState().activeTasks;

/** Set of cancelled task IDs */
const cancelledTasks = getGlobalState().cancelledTasks;

/** Queue of pending tasks waiting to run */
const taskQueue = getGlobalState().taskQueue;

/** Get max parallel tasks from global state */
function getMaxParallelTasksValue(): number {
  return getGlobalState().maxParallelTasks;
}

/** Get settings loaded flag from global state */
function getSettingsLoadedValue(): boolean {
  return getGlobalState().settingsLoaded;
}

/**
 * Update the max parallel tasks setting
 */
export function setMaxParallelTasks(max: number): void {
  const state = getGlobalState();
  state.maxParallelTasks = Math.max(1, Math.min(10, max));
  state.settingsLoaded = true;
  // Try to start queued tasks if we increased the limit
  processQueue();
}

/**
 * Get current max parallel tasks setting
 */
export function getMaxParallelTasks(): number {
  return getMaxParallelTasksValue();
}

/**
 * Check if settings have been loaded from DB
 */
export function isSettingsLoaded(): boolean {
  return getSettingsLoadedValue();
}

/**
 * Count currently running tasks
 */
function getRunningTaskCount(): number {
  let count = 0;
  for (const tracker of activeTasks.values()) {
    if (tracker.getProgress().status === 'running') {
      count++;
    }
  }
  return count;
}

/**
 * Process the queue - start tasks if slots are available
 */
function processQueue(): void {
  while (taskQueue.length > 0 && getRunningTaskCount() < getMaxParallelTasksValue()) {
    const next = taskQueue.shift()!;
    const tracker = activeTasks.get(next.taskId);
    if (tracker && tracker.getProgress().status === 'pending') {
      tracker.start();
      next.run().catch((error) => {
        tracker.fail(error instanceof Error ? error.message : String(error));
      });
    }
  }
}

/**
 * Called when a task completes - process queue for next task
 */
function onTaskComplete(taskId: string): void {
  // Process queue after a small delay to allow cleanup
  setImmediate(() => processQueue());
}

/**
 * Create and queue a TMDB task
 * Returns the tracker immediately; task starts when a slot is available
 * @param title - Optional custom title for display (e.g., "Sync: Arrow")
 */
export function createTmdbTask(
  type: 'tmdb-bulk-match' | 'tmdb-refresh-missing' | 'tmdb-bulk-refresh' | 'tmdb-import',
  title?: string,
  runFn?: () => Promise<void>
): TaskProgressTracker<TmdbTaskProgress> {
  const canRunNow = getRunningTaskCount() < getMaxParallelTasksValue();

  const progress: TmdbTaskProgress = {
    taskId: randomUUID(),
    type,
    title,
    status: canRunNow ? 'running' : 'pending',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
  };

  const tracker = new TaskProgressTracker(progress);
  activeTasks.set(progress.taskId, tracker as unknown as TaskProgressTracker<BaseTaskProgress>);

  // If a run function is provided and we need to queue, add to queue
  if (runFn && !canRunNow) {
    taskQueue.push({ taskId: progress.taskId, run: runFn });
  }

  return tracker;
}

/**
 * Queue a task to run when a slot is available
 */
export function queueTaskRun(taskId: string, runFn: () => Promise<void>): void {
  const tracker = activeTasks.get(taskId);
  if (!tracker) return;

  const status = tracker.getProgress().status;
  if (status === 'pending') {
    taskQueue.push({ taskId, run: runFn });
  }
  // If already running, the caller will run it themselves
}

/**
 * Check if a task can run immediately
 */
export function canRunImmediately(): boolean {
  return getRunningTaskCount() < getMaxParallelTasksValue();
}

/**
 * Create an FFprobe analysis task
 * @param fileId - The EpisodeFile ID being analyzed
 * @param filename - The filename for display
 */
export function createFfprobeTask(
  fileId: number,
  filename: string
): TaskProgressTracker<FfprobeTaskProgress> {
  const canRunNow = getRunningTaskCount() < getMaxParallelTasksValue();

  const progress: FfprobeTaskProgress = {
    taskId: randomUUID(),
    type: 'ffprobe-analyze',
    title: `Analyze: ${filename}`,
    status: canRunNow ? 'running' : 'pending',
    total: 1,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
    fileId,
  };

  const tracker = new TaskProgressTracker(progress);
  activeTasks.set(progress.taskId, tracker as unknown as TaskProgressTracker<BaseTaskProgress>);
  return tracker;
}

/**
 * Create a new scan task
 * @param scanId - Database scan history ID
 * @param customTitle - Optional custom title for display (e.g., "Sync: Show Name")
 * @param taskType - Task type, defaults to 'scan'
 */
export function createScanTask(
  scanId: number,
  customTitle?: string,
  taskType: 'scan' | 'show-sync' = 'scan'
): TaskProgressTracker<ScanTaskProgress> {
  const canRunNow = getRunningTaskCount() < getMaxParallelTasksValue();

  const progress: ScanTaskProgress = {
    taskId: randomUUID(),
    type: taskType,
    title: customTitle,
    status: canRunNow ? 'running' : 'pending',
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startedAt: new Date(),
    phase: 'discovering',
    scanId,
    filesAdded: 0,
    filesUpdated: 0,
    filesDeleted: 0,
  };

  const tracker = new TaskProgressTracker(progress);
  activeTasks.set(progress.taskId, tracker as unknown as TaskProgressTracker<BaseTaskProgress>);
  return tracker;
}

/**
 * Get a task tracker by ID
 */
export function getTaskTracker(taskId: string): TaskProgressTracker<BaseTaskProgress> | undefined {
  return activeTasks.get(taskId);
}

/**
 * Remove a task tracker (after completion)
 */
export function removeTask(taskId: string): void {
  activeTasks.delete(taskId);
  cancelledTasks.delete(taskId);
  // Remove from queue if pending
  const queueIndex = taskQueue.findIndex((q) => q.taskId === taskId);
  if (queueIndex !== -1) {
    taskQueue.splice(queueIndex, 1);
  }
}

/**
 * Request cancellation of a task
 */
export function requestCancellation(taskId: string): boolean {
  if (activeTasks.has(taskId)) {
    cancelledTasks.add(taskId);
    return true;
  }
  return false;
}

/**
 * Check if a task has been cancelled
 */
export function isCancelled(taskId: string): boolean {
  return cancelledTasks.has(taskId);
}

/**
 * Check if a task is currently running
 */
export function isTaskRunning(taskId: string): boolean {
  const tracker = activeTasks.get(taskId);
  return tracker?.getProgress().status === 'running';
}

/**
 * Check if a task is pending (queued)
 */
export function isTaskPending(taskId: string): boolean {
  const tracker = activeTasks.get(taskId);
  return tracker?.getProgress().status === 'pending';
}

/**
 * Get all active tasks (running and pending)
 */
export function getActiveTasks(): Array<SerializedTaskProgress> {
  return Array.from(activeTasks.values())
    .map((tracker) => tracker.getSerialized())
    .sort((a, b) => {
      // Running tasks first, then pending, then by start time
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
}

/**
 * Get task counts for UI display
 */
export function getTaskCounts(): { running: number; pending: number; total: number } {
  let running = 0;
  let pending = 0;
  for (const tracker of activeTasks.values()) {
    const status = tracker.getProgress().status;
    if (status === 'running') running++;
    else if (status === 'pending') pending++;
  }
  return { running, pending, total: running + pending };
}

/**
 * Yield to event loop to keep app responsive
 *
 * Uses setTimeout(0) instead of setImmediate because setImmediate
 * runs before I/O callbacks, while setTimeout allows HTTP handlers
 * to process first. This is critical for keeping the app responsive
 * during background tasks, especially in Docker/production.
 *
 * Note: Most tasks now run in worker threads, but this is still used
 * by the scanner which runs in the main thread.
 */
export const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** Default task retention: 1 hour */
const DEFAULT_TASK_RETENTION_MS = 3600000;

/**
 * Schedule task cleanup after completion
 * Keeps task in memory to allow status fetch and review
 * Default: 1 hour, configurable via TASK_RETENTION_MS env var
 */
export function scheduleCleanup(taskId: string, delayMs?: number): void {
  const delay = delayMs ?? (parseInt(process.env.TASK_RETENTION_MS || '') || DEFAULT_TASK_RETENTION_MS);
  setTimeout(() => removeTask(taskId), delay);
}
