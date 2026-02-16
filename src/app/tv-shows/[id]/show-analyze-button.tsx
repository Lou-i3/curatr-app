'use client';

/**
 * Bulk FFprobe analyze button for the show detail page
 * Triggers analysis of all unanalyzed files for this show
 */

import { useState } from 'react';
import { FileSearch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTasks } from '@/lib/contexts/task-context';

interface ShowAnalyzeButtonProps {
  show: {
    id: number;
    title: string;
  };
}

export function ShowAnalyzeButton({ show }: ShowAnalyzeButtonProps) {
  const { tasks, refresh: refreshTasks } = useTasks();
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reanalyze, setReanalyze] = useState(false);

  // Check if there's already an analyze task for this show
  const activeTask = tasks.find(
    (t) =>
      t.type === 'ffprobe-bulk-analyze' &&
      (t.status === 'running' || t.status === 'pending') &&
      t.title === `FFprobe: ${show.title}`
  );
  const isActive = !!activeTask;
  const isQueued = activeTask?.status === 'pending';

  const handleAnalyze = async () => {
    if (starting || isActive) return;

    setStarting(true);
    try {
      const response = await fetch('/api/ffprobe/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'show', showId: show.id, reanalyze }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start analysis');
      }

      setOpen(false);
      setReanalyze(false);

      if (data.total === 0) {
        toast.info('All files already analyzed');
      } else if (data.status === 'pending') {
        toast.success(`Analysis queued for ${data.total} files`);
      } else {
        toast.success(`Analyzing ${data.total} files...`);
      }

      await refreshTasks();
    } catch (error) {
      setOpen(false);
      toast.error(error instanceof Error ? error.message : 'Failed to start analysis');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReanalyze(false); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isActive}>
          {isActive ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <FileSearch className="size-4 mr-1" />
          )}
          {isQueued ? 'Queued...' : isActive ? 'Analyzing...' : 'Analyze'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Analyze Files for {show.title}</DialogTitle>
          <DialogDescription>
            Run FFprobe analysis on files for this show.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>The analysis will extract detailed media information including:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Video codec, resolution, and HDR type</li>
              <li>Audio codec, channels, and language tracks</li>
              <li>Subtitle tracks and languages</li>
              <li>Bitrate, duration, and container format</li>
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="reanalyze-show" className="text-sm cursor-pointer">
              Re-analyze previously analyzed files
            </Label>
            <Switch
              id="reanalyze-show"
              checked={reanalyze}
              onCheckedChange={setReanalyze}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAnalyze} disabled={starting}>
            {starting ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <FileSearch className="size-4 mr-1" />
                Start Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
