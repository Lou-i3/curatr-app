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

/** Global registry of active tasks */
export const activeTasks = new Map<string, TaskProgressTracker<BaseTaskProgress>>();

/** Set of cancelled task IDs */
const cancelledTasks = new Set<string>();

/** Queue of pending tasks waiting to run */
interface QueuedTask {
  taskId: string;
  run: () => Promise<void>;
}
const taskQueue: QueuedTask[] = [];

/** Current max parallel tasks setting */
let maxParallelTasks = DEFAULT_MAX_PARALLEL_TASKS;

/**
 * Update the max parallel tasks setting
 */
export function setMaxParallelTasks(max: number): void {
  maxParallelTasks = Math.max(1, Math.min(10, max));
  // Try to start queued tasks if we increased the limit
  processQueue();
}

/**
 * Get current max parallel tasks setting
 */
export function getMaxParallelTasks(): number {
  return maxParallelTasks;
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
  while (taskQueue.length > 0 && getRunningTaskCount() < maxParallelTasks) {
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
 */
export function createTmdbTask(
  type: 'tmdb-bulk-match' | 'tmdb-refresh-missing' | 'tmdb-bulk-refresh' | 'tmdb-import',
  runFn?: () => Promise<void>
): TaskProgressTracker<TmdbTaskProgress> {
  const canRunNow = getRunningTaskCount() < maxParallelTasks;

  const progress: TmdbTaskProgress = {
    taskId: randomUUID(),
    type,
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
  return getRunningTaskCount() < maxParallelTasks;
}

/**
 * Create a new scan task
 */
export function createScanTask(scanId: number): TaskProgressTracker<ScanTaskProgress> {
  const canRunNow = getRunningTaskCount() < maxParallelTasks;

  const progress: ScanTaskProgress = {
    taskId: randomUUID(),
    type: 'scan',
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
 */
export const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

/**
 * Schedule task cleanup after completion
 * Keeps task in memory for a short time to allow final status fetch
 */
export function scheduleCleanup(taskId: string, delayMs = 60000): void {
  setTimeout(() => removeTask(taskId), delayMs);
}
