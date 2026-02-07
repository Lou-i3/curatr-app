'use client';

/**
 * Tasks page - View and manage running background tasks
 */

import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { useTasks, type TaskData } from '@/lib/contexts/task-context';

// Re-use TaskData from context
type TaskProgress = TaskData;

const TASK_TYPE_LABELS: Record<string, string> = {
  'scan': 'Library Scan',
  'tmdb-bulk-match': 'TMDB Auto-Match',
  'tmdb-refresh-missing': 'TMDB Refresh Missing',
  'tmdb-bulk-refresh': 'TMDB Refresh Metadata',
  'tmdb-import': 'TMDB Import',
};

function getTaskLabel(type: string): string {
  return TASK_TYPE_LABELS[type] || type;
}

function getStatusBadge(status: TaskProgress['status']) {
  switch (status) {
    case 'running':
      return (
        <Badge variant="secondary">
          <Loader2 className="size-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="warning">
          <Clock className="size-3 mr-1" />
          Queued
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success">
          <CheckCircle2 className="size-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="size-3 mr-1" />
          Failed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline">
          <AlertTriangle className="size-3 mr-1" />
          Cancelled
        </Badge>
      );
  }
}

export default function TasksPage() {
  const { tasks, loading, refresh } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');

  // Refresh tasks immediately when page loads and fetch settings
  useEffect(() => {
    refresh();
    fetch('/api/settings')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.dateFormat) setDateFormat(data.dateFormat);
      })
      .catch(() => {});
  }, [refresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCancel = async (taskId: string) => {
    setCancellingId(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      await refresh();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    } finally {
      setCancellingId(null);
    }
  };

  // Separate tasks by status
  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-muted-foreground">View and manage background tasks</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground">View and manage background tasks</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Active Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Active Tasks
            {activeTasks.length > 0 && (
              <Badge variant="secondary">{activeTasks.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Currently running and queued tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active tasks
            </p>
          ) : (
            <div className="space-y-4">
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
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Tasks
              <Badge variant="outline">{completedTasks.length}</Badge>
            </CardTitle>
            <CardDescription>Recently completed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <TaskCard key={task.taskId} task={task} dateFormat={dateFormat} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: TaskProgress;
  dateFormat: DateFormat;
  onCancel?: () => void;
  cancelling?: boolean;
}

function TaskCard({ task, dateFormat, onCancel, cancelling }: TaskCardProps) {
  const percent = task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0;
  const isActive = task.status === 'running' || task.status === 'pending';

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium">{task.title || getTaskLabel(task.type)}</span>
          {getStatusBadge(task.status)}
        </div>
        {isActive && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
          </Button>
        )}
      </div>

      {/* Progress bar (for running tasks) */}
      {task.status === 'running' && (
        <div className="space-y-1">
          <Progress value={percent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {task.processed} / {task.total}
            </span>
            <span>{percent}%</span>
          </div>
        </div>
      )}

      {/* Current item */}
      {task.status === 'running' && task.currentItem && (
        <p className="text-sm text-muted-foreground truncate">
          Processing: {task.currentItem}
        </p>
      )}

      {/* Scan phase */}
      {task.type === 'scan' && task.phase && task.status === 'running' && (
        <p className="text-sm text-muted-foreground">
          Phase: {task.phase}
        </p>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-sm">
        {task.succeeded > 0 && (
          <span className="text-green-600">
            <CheckCircle2 className="size-3 inline mr-1" />
            {task.succeeded} succeeded
          </span>
        )}
        {task.failed > 0 && (
          <span className="text-destructive">
            <XCircle className="size-3 inline mr-1" />
            {task.failed} failed
          </span>
        )}
        {task.status === 'pending' && (
          <span className="text-muted-foreground">
            Waiting for slot...
          </span>
        )}
      </div>

      {/* Scan-specific stats */}
      {task.type === 'scan' && task.status === 'completed' && (
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {task.filesAdded !== undefined && task.filesAdded > 0 && (
            <span>{task.filesAdded} added</span>
          )}
          {task.filesUpdated !== undefined && task.filesUpdated > 0 && (
            <span>{task.filesUpdated} updated</span>
          )}
          {task.filesDeleted !== undefined && task.filesDeleted > 0 && (
            <span>{task.filesDeleted} deleted</span>
          )}
        </div>
      )}

      {/* Errors summary */}
      {task.errors.length > 0 && task.status !== 'running' && (
        <details className="text-sm">
          <summary className="cursor-pointer text-destructive">
            {task.errors.length} error{task.errors.length !== 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            {task.errors.slice(0, 5).map((err, i) => (
              <li key={i} className="text-muted-foreground">
                {err.item ? `${err.item}: ` : ''}{err.error}
              </li>
            ))}
            {task.errors.length > 5 && (
              <li className="text-muted-foreground">
                ...and {task.errors.length - 5} more
              </li>
            )}
          </ul>
        </details>
      )}

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground">
        Started: {formatDateTimeWithFormat(new Date(task.startedAt), dateFormat)}
        {task.completedAt && (
          <> · Finished: {formatDateTimeWithFormat(new Date(task.completedAt), dateFormat)}</>
        )}
      </div>
    </div>
  );
}
