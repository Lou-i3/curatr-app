'use client';

/**
 * TasksPanel - Slide-in sheet panel for viewing and managing background tasks
 * Triggered from the AppBar task indicator icon.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { RefreshCw, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useTasks } from '@/lib/contexts/task-context';
import { type DateFormat } from '@/lib/settings-shared';
import { TaskCard } from '@/components/tasks/task-card';

// --- Context for open/close state ---

interface TasksPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TasksPanelContext = createContext<TasksPanelContextValue | null>(null);

export function useTasksPanel() {
  const context = useContext(TasksPanelContext);
  if (!context) {
    throw new Error('useTasksPanel must be used within a TasksPanelProvider');
  }
  return context;
}

export function TasksPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <TasksPanelContext.Provider value={{ open, setOpen }}>
      {children}
    </TasksPanelContext.Provider>
  );
}

// --- Panel component ---

export function TasksPanel() {
  const { open, setOpen } = useTasksPanel();
  const { tasks, loading, refresh } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');

  // Fetch settings + refresh tasks when panel opens
  useEffect(() => {
    if (!open) return;
    refresh();
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.dateFormat) setDateFormat(data.dateFormat);
      })
      .catch(() => {});
  }, [open, refresh]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCancel = useCallback(async (taskId: string) => {
    setCancellingId(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      await refresh();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    } finally {
      setCancellingId(null);
    }
  }, [refresh]);

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-none md:w-[40%] p-0 flex flex-col top-12 h-[calc(100%-3rem)]"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-4 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Tasks</SheetTitle>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="size-8" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
              </Button>
              <SheetClose asChild>
                <Button variant="outline" size="icon" className="size-8">
                  <X className="size-3.5" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription>Background tasks and operations</SheetDescription>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {/* Active Tasks */}
              {activeTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">Active Tasks</h3>
                    <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {activeTasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        dateFormat={dateFormat}
                        onCancel={() => handleCancel(task.taskId)}
                        cancelling={cancellingId === task.taskId}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">Recent Tasks</h3>
                    <Badge variant="outline" className="text-xs">{completedTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <TaskCard key={task.taskId} task={task} dateFormat={dateFormat} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state when no tasks at all */}
              {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  There are no recent tasks
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
