'use client';

/**
 * TaskProgress - Displays real-time progress for a running task
 *
 * Subscribes to SSE updates and shows progress bar, current item,
 * success/fail counts, and cancel button.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';

export interface TaskProgressData {
  taskId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ item: string; error: string }>;
  startedAt: string;
  completedAt?: string;
}

interface TaskProgressProps {
  taskId: string;
  title: string;
  onComplete?: (progress: TaskProgressData) => void;
  onClose?: () => void;
}

export function TaskProgress({
  taskId,
  title,
  onComplete,
  onClose,
}: TaskProgressProps) {
  const [progress, setProgress] = useState<TaskProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Subscribe to SSE progress updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TaskProgressData;
        setProgress(data);

        // Call onComplete when task finishes
        if (data.status !== 'running' && data.status !== 'pending') {
          eventSource.close();
          onComplete?.(data);
        }
      } catch (e) {
        console.error('Failed to parse progress:', e);
      }
    };

    eventSource.onerror = () => {
      // Try to fetch final status on error
      fetch(`/api/tasks/${taskId}`)
        .then((res) => {
          if (res.status === 404) {
            // Task was cleaned up - close silently
            onClose?.();
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (!data) return; // Already handled 404
          if (data.taskId) {
            setProgress(data);
            if (data.status !== 'running' && data.status !== 'pending') {
              onComplete?.(data);
            }
          } else if (data.error) {
            // Task not found - was cleaned up, close silently
            onClose?.();
          }
        })
        .catch(() => setError('Connection lost'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [taskId, onComplete]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to cancel task:', e);
    }
    setCancelling(false);
  }, [taskId]);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="size-4" />
              <span>{error}</span>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const isRunning = progress.status === 'running';
  const isPending = progress.status === 'pending';
  const isActive = isRunning || isPending;
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isCancelled = progress.status === 'cancelled';

  return (
    <Card className={
      isCompleted ? 'border-success/50' :
      isFailed ? 'border-destructive/50' :
      isCancelled ? 'border-border/50' :
      isPending ? 'border-secondary/50' :
      ''
    }>
      <CardContent className="pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="size-4 animate-spin text-primary" />}
            {isPending && <Clock className="size-4 text-warning-foreground" />}
            {isCompleted && <CheckCircle2 className="size-4 text-success-foreground" />}
            {isFailed && <XCircle className="size-4 text-destructive-foreground" />}
            {isCancelled && <AlertTriangle className="size-4 text-muted-foreground" />}
            <span className="font-medium">{title}</span>
            {isPending && <Badge variant="secondary" className="text-xs">Queued</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : null}
                Cancel
              </Button>
            )}
            {!isActive && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={percent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {progress.processed} / {progress.total}
            </span>
            <span>{percent}%</span>
          </div>
        </div>

        {/* Current item or pending message */}
        {isPending && (
          <div className="text-sm text-amber-600">
            Waiting for another task to complete...
          </div>
        )}
        {isRunning && progress.currentItem && (
          <div className="text-sm text-muted-foreground truncate">
            Processing: {progress.currentItem}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3">
          <Badge variant="outline" className="bg-success/10 border-success/50 text-success gap-2">
            <CheckCircle2 className="size-3 mr-1" />
            {progress.succeeded} succeeded
          </Badge>
          {progress.failed > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-2">
              <XCircle className="size-3 mr-1" />
              {progress.failed} failed
            </Badge>
          )}
        </div>

        {/* Completion message */}
        {isCompleted && progress.failed === 0 && (
          <div className="text-sm text-success-foreground">
            All items processed successfully
          </div>
        )}
        {isCompleted && progress.failed > 0 && (
          <div className="text-sm text-warning-foreground">
            Completed with {progress.failed} failures
          </div>
        )}
        {isFailed && progress.errors.length > 0 && (
          <div className="text-sm text-destructive">
            {progress.errors[progress.errors.length - 1]?.error || 'Task failed'}
          </div>
        )}
        {isCancelled && (
          <div className="text-sm text-muted-foreground">
            Task was cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}
