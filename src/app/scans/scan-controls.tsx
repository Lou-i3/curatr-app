'use client';

/**
 * Scan controls — start scans, show progress, cancel
 * Uses task context for scan state and router.refresh() for soft updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { ScanHelpDialog } from './scan-help-dialog';
import { useTasks } from '@/lib/contexts/task-context';

interface ScanProgress {
  scanId: number;
  phase: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: Array<{ filepath: string; error: string; phase: string }>;
}

interface ScanControlsProps {
  tvShowsPath?: string;
  moviesPath?: string;
}

export function ScanControls({ tvShowsPath, moviesPath }: ScanControlsProps) {
  const router = useRouter();
  const { tasks, refresh: refreshTasks } = useTasks();
  const [mounted, setMounted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Track if we started the scan (vs observing existing one)
  const startedByUsRef = useRef(false);
  // Track if we've seen the task in the context (prevents race condition on start)
  const hasSeenTaskRef = useRef(false);
  // Track if cancel was requested (prevents task context from re-enabling scanning)
  const cancelRequestedRef = useRef(false);

  // Track when component has mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with task context for running scans
  useEffect(() => {
    // Don't react to task changes if we just cancelled
    if (cancelRequestedRef.current) return;

    const runningScan = tasks.find(
      (t) => t.type === 'scan' && (t.status === 'running' || t.status === 'pending')
    );

    if (runningScan && runningScan.scanId) {
      hasSeenTaskRef.current = true;

      // There's a running scan - show its progress from task data
      if (!isScanning) {
        setIsScanning(true);
        setScanId(runningScan.scanId);
        // Only try SSE if we started the scan (otherwise just use task context data)
        if (startedByUsRef.current) {
          subscribeToProgress(runningScan.scanId);
        }
      }
      // Always update progress from task data
      setProgress({
        scanId: runningScan.scanId,
        phase: runningScan.phase || 'saving',
        totalFiles: runningScan.total,
        processedFiles: runningScan.processed,
        currentFile: runningScan.currentItem,
        errors: runningScan.errors.map((e) => ({
          filepath: e.item,
          error: e.error,
          phase: 'saving',
        })),
      });
    } else if (isScanning && !runningScan && hasSeenTaskRef.current) {
      // Scan completed — only trigger when we've actually seen the task before
      setIsScanning(false);
      setProgress(null);
      startedByUsRef.current = false;
      hasSeenTaskRef.current = false;
      // Soft refresh to update scan history table
      router.refresh();
    }
  }, [tasks, isScanning, router]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const startScan = async () => {
    setError(null);
    setIsScanning(true);
    setProgress(null);
    startedByUsRef.current = true;
    cancelRequestedRef.current = false;

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'full' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start scan');
      }

      const data = await response.json();
      setScanId(data.scanId);

      // Refresh task context to show new task in sidebar
      await refreshTasks();

      // Start listening for progress updates
      subscribeToProgress(data.scanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setIsScanning(false);
      startedByUsRef.current = false;
    }
  };

  const subscribeToProgress = (id: number) => {
    // Close existing connection if any
    eventSourceRef.current?.close();

    const eventSource = new EventSource(`/api/scan/${id}/progress`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data: ScanProgress = JSON.parse(event.data);
      setProgress(data);

      if (data.phase === 'complete') {
        eventSource.close();
        eventSourceRef.current = null;
        setIsScanning(false);
        startedByUsRef.current = false;
        hasSeenTaskRef.current = false;
        // Soft refresh to update scan history table
        router.refresh();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      // Poll for status instead
      pollStatus(id);
    };
  };

  const pollStatus = async (id: number) => {
    try {
      const response = await fetch(`/api/scan/${id}`);
      const data = await response.json();

      if (!data.isRunning) {
        setIsScanning(false);
        startedByUsRef.current = false;
        hasSeenTaskRef.current = false;
        router.refresh();
      } else {
        setProgress(data);
        setTimeout(() => pollStatus(id), 1000);
      }
    } catch {
      setIsScanning(false);
    }
  };

  const cancelScan = useCallback(async () => {
    if (!scanId) return;

    cancelRequestedRef.current = true;
    try {
      await fetch(`/api/scan/${scanId}/cancel`, { method: 'POST' });
      // Close SSE if active
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setIsScanning(false);
      setProgress(null);
      startedByUsRef.current = false;
      hasSeenTaskRef.current = false;
      // Refresh tasks to show cancelled status
      await refreshTasks();
      // Soft refresh to update scan history
      router.refresh();
    } catch {
      // Reset cancel flag so task context can resume tracking
      cancelRequestedRef.current = false;
    }
  }, [scanId, refreshTasks, router]);

  const isIndeterminate = progress?.phase === 'discovering' || progress?.phase === 'cleanup';
  const progressPercent = progress && progress.totalFiles > 0
    ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
    : 0;

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case 'discovering':
        return 'Discovering files';
      case 'parsing':
        return 'Parsing filenames';
      case 'saving':
        return 'Saving to database';
      case 'cleanup':
        return 'Cleaning up deleted files';
      case 'complete':
        return 'Complete';
      default:
        return phase.replace('_', ' ');
    }
  };

  const getProgressText = (): string => {
    if (!progress) return '';
    if (progress.phase === 'discovering') {
      return 'Scanning directories...';
    }
    if (progress.phase === 'cleanup') {
      return 'Checking for removed files...';
    }
    if (progress.totalFiles === 0) {
      return 'Preparing...';
    }
    return `${progressPercent}% (${progress.processedFiles} / ${progress.totalFiles} files)`;
  };

  return (
    <div>
      <PageHeader
        title="Library Scans"
        description="Scan your media library to discover and track TV shows"
        breadcrumbs={[{ label: 'Scans' }]}
        info={<ScanHelpDialog tvShowsPath={tvShowsPath} moviesPath={moviesPath} />}
        action={
          <Button onClick={startScan} disabled={!mounted || isScanning}>
            {!mounted || isScanning ? 'Scanning...' : 'Start Scan'}
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mounted && isScanning && progress && (
        <Card className='mb-4'>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-start gap-2">
                <h2 className='text-md font-bold'>{getPhaseLabel(progress.phase)}...</h2>
                <span className="italic text-sm">
                  {getProgressText()}
                </span>
              </div>

              <Progress
                value={isIndeterminate ? undefined : progressPercent}
                className={`h-2 ${isIndeterminate ? 'animate-pulse' : ''}`}
              />

              {progress.currentFile && !isIndeterminate && (
                <p className="text-xs text-muted-foreground truncate">
                  {progress.currentFile}
                </p>
              )}

              {progress.errors.length > 0 && (
                <p className="text-xs text-destructive">
                  {progress.errors.length} error(s) encountered
                </p>
              )}

              <Button variant="outline" onClick={cancelScan}>
                Cancel Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
