'use client';

/**
 * Task Context - Shared task state across the application
 * Single polling source to reduce API calls and keep components in sync
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/auth-context';

export interface TaskData {
  taskId: string;
  type: string;
  title?: string; // Custom display title (e.g., "Scan: Arrow")
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ item: string; error: string }>;
  startedAt: string;
  completedAt?: string;
  phase?: string;
  scanId?: number;
  filesAdded?: number;
  filesUpdated?: number;
  filesDeleted?: number;
}

interface TaskCounts {
  running: number;
  pending: number;
  total: number;
}

interface TaskContextValue {
  tasks: TaskData[];
  counts: TaskCounts;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

/**
 * Get human-readable task title for notifications
 */
function getTaskTitle(type: string): string {
  switch (type) {
    case 'scan':
      return 'Library Scan';
    case 'tmdb-bulk-match':
      return 'TMDB Auto-Match';
    case 'tmdb-bulk-refresh':
      return 'TMDB Refresh';
    case 'tmdb-refresh-missing':
      return 'TMDB Missing Data Sync';
    case 'tmdb-import':
      return 'TMDB Import';
    default:
      return 'Background Task';
  }
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({ running: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Track previous task statuses for notification detection
  const previousStatuses = useRef<Map<string, string>>(new Map());

  // Returns number of active tasks for polling adjustment
  const fetchTasks = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) return 0;

      const data = await response.json();
      const taskList: TaskData[] = data.tasks || [];

      // Calculate counts
      const running = taskList.filter((t) => t.status === 'running').length;
      const pending = taskList.filter((t) => t.status === 'pending').length;
      const activeCount = running + pending;

      // Check for task completions (for notifications)
      for (const task of taskList) {
        const prevStatus = previousStatuses.current.get(task.taskId);

        // Task transitioned from running to terminal state
        if (prevStatus === 'running' && task.status !== 'running') {
          // Use custom title if available, otherwise fall back to type-based title
          const title = task.title || getTaskTitle(task.type);

          if (task.status === 'completed') {
            if (task.failed > 0) {
              toast.warning(title, {
                description: `Completed with ${task.failed} failure${task.failed > 1 ? 's' : ''}`,
                duration: Infinity,
              });
            } else {
              toast.success(title, {
                description: `${task.succeeded} item${task.succeeded !== 1 ? 's' : ''} processed successfully`,
                duration: Infinity,
              });
            }
          } else if (task.status === 'failed') {
            toast.error(title, {
              description: 'Task failed - check Tasks page for details',
              duration: Infinity,
            });
          } else if (task.status === 'cancelled') {
            toast.info(title, {
              description: 'Task was cancelled',
              duration: Infinity,
            });
          }
        }

        previousStatuses.current.set(task.taskId, task.status);
      }

      // Clean up tasks no longer in the list
      const currentIds = new Set(taskList.map((t) => t.taskId));
      for (const taskId of previousStatuses.current.keys()) {
        if (!currentIds.has(taskId)) {
          previousStatuses.current.delete(taskId);
        }
      }

      setTasks(taskList);
      setCounts({ running, pending, total: activeCount });
      setLoading(false);
      return activeCount;
    } catch {
      // Silently fail - will retry on next poll
      return 0;
    }
  }, []);

  useEffect(() => {
    // Don't poll until auth state is resolved and user is authenticated
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let hasActiveTasks = false;

    const poll = async () => {
      const activeCount = await fetchTasks();
      const currentHasActive = activeCount > 0;

      // Adjust polling rate based on activity
      if (currentHasActive !== hasActiveTasks) {
        hasActiveTasks = currentHasActive;
        clearInterval(intervalId);
        // 2s when active, 15s when idle
        intervalId = setInterval(poll, hasActiveTasks ? 2000 : 15000);
      }
    };

    // Initial fetch immediately
    poll();

    // Start with moderate polling (5s), will adjust based on activity
    intervalId = setInterval(poll, 5000);

    return () => clearInterval(intervalId);
  }, [fetchTasks, authLoading, isAuthenticated]);

  // Wrapper to match expected Promise<void> return type
  const refresh = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  return (
    <TaskContext.Provider value={{ tasks, counts, loading, refresh }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}

/**
 * Hook for just the task counts (sidebar use case)
 */
export function useTaskCounts() {
  const { counts } = useTaskContext();
  return counts;
}

/**
 * Hook for full task list (tasks page use case)
 */
export function useTasks() {
  const { tasks, loading, refresh } = useTaskContext();
  return { tasks, loading, refresh };
}
