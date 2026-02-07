/**
 * Worker Manager
 *
 * Manages worker threads for running background tasks.
 * Keeps the main event loop completely free for HTTP requests.
 */

import { Worker } from 'worker_threads';
import { resolve, isAbsolute, join } from 'path';
import { TaskProgressTracker, scheduleCleanup, queueTaskRun } from './progress';
import type { TmdbTaskProgress } from './types';

// Worker message types
interface WorkerProgressMessage {
  type: 'progress';
  taskId: string;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ item: string; error: string }>;
}

interface WorkerCompleteMessage {
  type: 'complete';
  taskId: string;
}

interface WorkerFailMessage {
  type: 'fail';
  taskId: string;
  error: string;
}

type WorkerMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerFailMessage;

// Track active workers for cleanup
const activeWorkers = new Map<string, Worker>();

/**
 * Normalize database URL for worker threads
 * Converts relative file paths to absolute paths
 */
function normalizeDatabaseUrl(url: string): string {
  if (url.startsWith('file:')) {
    const path = url.substring(5);
    if (!isAbsolute(path)) {
      return `file:${resolve(process.cwd(), path)}`;
    }
  }
  return url;
}

/**
 * Get the path to the worker script
 * Works in both development and Docker standalone mode
 */
function getWorkerPath(): string {
  // In development: src/lib/tasks/task-worker.js
  // In Docker: copied to /app/task-worker.js
  const devPath = join(process.cwd(), 'src/lib/tasks/task-worker.js');
  const prodPath = join(process.cwd(), 'task-worker.js');

  // Check if we're in production (Docker) - the file will be at root
  // In dev, use the src path
  return process.env.NODE_ENV === 'production' ? prodPath : devPath;
}

/**
 * Get module paths for the worker to find dependencies
 */
function getModulePaths(): string[] {
  return [
    resolve(process.cwd(), 'node_modules'),
    resolve(process.cwd(), '.next/standalone/node_modules'),
    resolve(process.cwd(), '../node_modules'),
  ];
}

/**
 * Run a task in a worker thread
 * Respects the task queue - if the task is pending, queues the worker spawn
 */
export function runInWorker(
  taskId: string,
  taskType: string,
  taskData: unknown,
  tracker: TaskProgressTracker<TmdbTaskProgress>
): void {
  const status = tracker.getProgress().status;

  // If task is pending (queued), register the worker spawn for later
  if (status === 'pending') {
    queueTaskRun(taskId, async () => {
      spawnWorker(taskId, taskType, taskData, tracker);
    });
    return;
  }

  // Task can run now - spawn worker immediately
  spawnWorker(taskId, taskType, taskData, tracker);
}

/**
 * Actually spawn a worker thread for a task
 */
function spawnWorker(
  taskId: string,
  taskType: string,
  taskData: unknown,
  tracker: TaskProgressTracker<TmdbTaskProgress>
): void {
  const rawDatabaseUrl = process.env.DATABASE_URL;

  if (!rawDatabaseUrl) {
    tracker.fail('DATABASE_URL not configured');
    return;
  }

  const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);
  const workerPath = getWorkerPath();
  const modulePaths = getModulePaths();

  try {
    const worker = new Worker(workerPath, {
      workerData: {
        taskId,
        taskType,
        taskData,
        databaseUrl,
        modulePaths,
      },
    });

    activeWorkers.set(taskId, worker);

    worker.on('message', (message: WorkerMessage) => {
      switch (message.type) {
        case 'progress':
          tracker.update({
            processed: message.processed,
            succeeded: message.succeeded,
            failed: message.failed,
            currentItem: message.currentItem,
            errors: message.errors,
          } as Partial<TmdbTaskProgress>);
          break;

        case 'complete':
          tracker.complete();
          scheduleCleanup(taskId);
          activeWorkers.delete(taskId);
          break;

        case 'fail':
          tracker.fail(message.error);
          scheduleCleanup(taskId);
          activeWorkers.delete(taskId);
          break;
      }
    });

    worker.on('error', (error) => {
      console.error(`Worker error for task ${taskId}:`, error);
      tracker.fail(error.message);
      scheduleCleanup(taskId);
      activeWorkers.delete(taskId);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code} for task ${taskId}`);
        const progress = tracker.getProgress();
        if (progress.status === 'running') {
          tracker.fail(`Worker exited unexpectedly with code ${code}`);
          scheduleCleanup(taskId);
        }
      }
      activeWorkers.delete(taskId);
    });
  } catch (error) {
    console.error(`Failed to create worker for task ${taskId}:`, error);
    tracker.fail(error instanceof Error ? error.message : 'Failed to create worker');
    scheduleCleanup(taskId);
  }
}

/**
 * Terminate a worker thread
 */
export function terminateWorker(taskId: string): boolean {
  const worker = activeWorkers.get(taskId);
  if (worker) {
    worker.terminate();
    activeWorkers.delete(taskId);
    return true;
  }
  return false;
}

/**
 * Check if a worker is active
 */
export function isWorkerActive(taskId: string): boolean {
  return activeWorkers.has(taskId);
}
