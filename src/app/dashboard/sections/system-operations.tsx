'use client';

/**
 * System Operations section — live task status
 * Admin only. Uses existing task context for real-time polling.
 */

import { ArrowRight, CheckCircle2, Loader2, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTasks } from '@/lib/contexts/task-context';
import type { TaskData } from '@/lib/contexts/task-context';
import { useTasksPanel } from '@/components/tasks/tasks-panel';

function getTaskTitle(task: TaskData): string {
  if (task.title) return task.title;
  switch (task.type) {
    case 'scan': return 'Library Scan';
    case 'show-scan': return 'Show Scan';
    case 'tmdb-bulk-match': return 'TMDB Auto-Match';
    case 'tmdb-bulk-refresh': return 'TMDB Refresh';
    case 'tmdb-refresh-missing': return 'TMDB Missing Data';
    case 'tmdb-import': return 'TMDB Import';
    case 'ffprobe-analyze': return 'FFprobe Analysis';
    default: return 'Background Task';
  }
}

function taskStatusVariant(status: string) {
  switch (status) {
    case 'running': return 'default' as const;
    case 'pending': return 'secondary' as const;
    case 'completed': return 'success' as const;
    case 'failed': return 'destructive' as const;
    case 'cancelled': return 'outline' as const;
    default: return 'outline' as const;
  }
}

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function SystemOperations() {
  const { tasks, loading } = useTasks();
  const { setOpen: openTasksPanel } = useTasksPanel();

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  const recentCompleted = tasks
    .filter((t) => t.status === 'completed' || t.status === 'failed')
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            System Operations
          </CardTitle>
          <CardDescription>Background tasks and system activity</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => openTasksPanel(true)}>
          All Tasks
          <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </div>
        ) : activeTasks.length === 0 && recentCompleted.length === 0 ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No active tasks — system is idle
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active tasks */}
            {activeTasks.map((task) => {
              const pct = task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0;
              return (
                <div key={task.taskId} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-3.5 animate-spin shrink-0" />
                    <span className="font-medium flex-1 truncate">{getTaskTitle(task)}</span>
                    <Badge variant={taskStatusVariant(task.status)} className="text-xs">
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatElapsed(task.startedAt)}
                    </span>
                  </div>
                  {task.total > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {task.processed}/{task.total}
                      </span>
                    </div>
                  )}
                  {task.currentItem && (
                    <p className="text-xs text-muted-foreground truncate pl-5">
                      {task.currentItem}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Recently completed (if no active tasks, show recent) */}
            {activeTasks.length === 0 && recentCompleted.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Recent</p>
                {recentCompleted.map((task) => (
                  <div key={task.taskId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{getTaskTitle(task)}</span>
                    <Badge variant={taskStatusVariant(task.status)} className="text-xs">
                      {task.status}
                    </Badge>
                    {task.succeeded > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {task.succeeded} done
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
