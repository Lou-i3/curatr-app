'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScanProgress {
  scanId: number;
  phase: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: Array<{ filepath: string; error: string; phase: string }>;
}

export function ScanControls() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScan = async () => {
    setError(null);
    setIsScanning(true);
    setProgress(null);

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

      // Start listening for progress updates
      subscribeToProgress(data.scanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setIsScanning(false);
    }
  };

  const subscribeToProgress = (id: number) => {
    const eventSource = new EventSource(`/api/scan/${id}/progress`);

    eventSource.onmessage = (event) => {
      const data: ScanProgress = JSON.parse(event.data);
      setProgress(data);

      if (data.phase === 'complete') {
        eventSource.close();
        setIsScanning(false);
        // Reload the page to show updated scan history
        window.location.reload();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
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
        window.location.reload();
      } else {
        setProgress(data);
        setTimeout(() => pollStatus(id), 1000);
      }
    } catch {
      setIsScanning(false);
    }
  };

  const cancelScan = async () => {
    if (!scanId) return;

    try {
      await fetch(`/api/scan/${scanId}/cancel`, { method: 'POST' });
      setIsScanning(false);
      setProgress(null);
    } catch {
      // Ignore cancel errors
    }
  };

  const progressPercent = progress && progress.totalFiles > 0
    ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Library</CardTitle>
        <CardDescription>
          Scan your TV shows directory to discover new files and update the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isScanning && progress ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize">{progress.phase.replace('_', ' ')}...</span>
              <span>{progress.processedFiles} / {progress.totalFiles} files</span>
            </div>

            <Progress value={progressPercent} className="h-2" />

            {progress.currentFile && (
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
        ) : (
          <Button onClick={startScan} disabled={isScanning}>
            {isScanning ? 'Starting...' : 'Start Scan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
