/**
 * Task management system
 *
 * Provides unified task tracking for all long-running operations.
 * Tasks run in separate worker threads to avoid blocking the main event loop.
 */

import { prisma } from '@/lib/prisma';
import { setMaxParallelTasks, isSettingsLoaded } from './progress';

/**
 * Ensure max parallel tasks setting is loaded from database
 * Call this before creating tasks to ensure the correct limit is used
 */
export async function ensureSettingsLoaded(): Promise<void> {
  if (isSettingsLoaded()) return;

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: { maxParallelTasks: true },
    });

    if (settings) {
      setMaxParallelTasks(settings.maxParallelTasks);
    }
  } catch {
    // Silently fail - will use default value
  }
}

// Types
export type {
  TaskType,
  TaskStatus,
  TaskError,
  BaseTaskProgress,
  ScanPhase,
  ScanTaskProgress,
  TmdbTaskProgress,
  FfprobeTaskProgress,
  TaskProgress,
  SerializedTaskProgress,
} from './types';

export { serializeProgress } from './types';

// Progress tracking
export {
  TaskProgressTracker,
  activeTasks,
  createTmdbTask,
  createScanTask,
  createFfprobeTask,
  getTaskTracker,
  removeTask,
  requestCancellation,
  isCancelled,
  isTaskRunning,
  isTaskPending,
  getActiveTasks,
  getTaskCounts,
  yieldToEventLoop,
  scheduleCleanup,
  setMaxParallelTasks,
  getMaxParallelTasks,
  isSettingsLoaded,
  canRunImmediately,
  queueTaskRun,
} from './progress';

// Worker thread management
export {
  runInWorker,
  terminateWorker,
  isWorkerActive,
} from './worker-manager';
