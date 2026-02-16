'use client';

/**
 * TaskCard - Shared task display component used by the tasks sheet panel
 */

import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { type TaskData } from '@/lib/contexts/task-context';

const TASK_TYPE_LABELS: Record<string, string> = {
  'scan': 'Library Scan',
  'show-scan': 'Show Scan',
  'tmdb-bulk-match': 'TMDB Auto-Match',
  'tmdb-refresh-missing': 'TMDB Refresh Missing',
  'tmdb-bulk-refresh': 'TMDB Refresh Metadata',
  'tmdb-import': 'TMDB Import',
  'ffprobe-analyze': 'FFprobe Analyze',
};

export function getTaskLabel(type: string): string {
  return TASK_TYPE_LABELS[type] || type;
}

export function getStatusBadge(status: TaskData['status']) {
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

interface TaskCardProps {
  task: TaskData;
  dateFormat: DateFormat;
  onCancel?: () => void;
  cancelling?: boolean;
}

export function TaskCard({ task, dateFormat, onCancel, cancelling }: TaskCardProps) {
  const percent = task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0;
  const isActive = task.status === 'running' || task.status === 'pending';

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="font-medium">{task.title || getTaskLabel(task.type)}</span>
          {getStatusBadge(task.status)}
        </div>
        {isActive && onCancel && (
          <div className="sm:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
            </Button>
          </div>
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
      {(task.type === 'scan' || task.type === 'show-scan') && task.phase && task.status === 'running' && (
        <p className="text-sm text-muted-foreground">
          Phase: {task.phase}
        </p>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-sm">
        {task.succeeded > 0 && (
          <Badge variant="outline" className="text-success-foreground">
            <CheckCircle2 className="size-3 inline mr-1" />
            {task.succeeded} succeeded
          </Badge>
        )}
        {task.failed > 0 && (
          <Badge variant="outline" className="text-destructive-foreground">
            <XCircle className="size-3 inline mr-1" />
            {task.failed} failed
          </Badge>
        )}
        {task.status === 'pending' && (
          <Badge variant="outline" className="text-muted-foreground">
            Waiting for slot...
          </Badge>
        )}
      </div>

      {/* Scan-specific stats */}
      {(task.type === 'scan' || task.type === 'show-scan') && task.status === 'completed' && (
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
          <summary className="cursor-pointer text-destructive-foreground">
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
