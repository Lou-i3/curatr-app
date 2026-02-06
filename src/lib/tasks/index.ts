/**
 * Task management system
 *
 * Provides unified task tracking for all long-running operations.
 */

// Types
export type {
  TaskType,
  TaskStatus,
  TaskError,
  BaseTaskProgress,
  ScanPhase,
  ScanTaskProgress,
  TmdbTaskProgress,
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
  canRunImmediately,
  queueTaskRun,
} from './progress';
