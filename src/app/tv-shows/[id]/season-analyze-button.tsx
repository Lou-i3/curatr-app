'use client';

/**
 * Bulk FFprobe analyze button for a season
 * Small icon button with confirmation dialog
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useTasks } from '@/lib/contexts/task-context';

interface SeasonAnalyzeButtonProps {
  seasonId: number;
  showId: number;
  showTitle: string;
  seasonNumber: number;
}

export function SeasonAnalyzeButton({
  seasonId,
  showId,
  showTitle,
  seasonNumber,
}: SeasonAnalyzeButtonProps) {
  const { tasks, refresh: refreshTasks } = useTasks();
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reanalyze, setReanalyze] = useState(false);

  const expectedTitle = `FFprobe: ${showTitle} S${String(seasonNumber).padStart(2, '0')}`;

  // Check if there's already an analyze task for this season
  const activeTask = tasks.find(
    (t) =>
      t.type === 'ffprobe-bulk-analyze' &&
      (t.status === 'running' || t.status === 'pending') &&
      t.title === expectedTitle
  );
  const isActive = !!activeTask;

  const handleAnalyze = async () => {
    if (starting || isActive) return;

    setStarting(true);
    try {
      const response = await fetch('/api/ffprobe/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'season', showId, seasonId, reanalyze }),
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
      <TooltipProvider>
        <Tooltip>
          <DialogTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isActive}
              >
                {isActive ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileSearch className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
          </DialogTrigger>
          <TooltipContent>Analyze with FFprobe</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Analyze Season {seasonNumber}</DialogTitle>
          <DialogDescription>
            Run FFprobe on files in this season?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            This will extract video, audio, and subtitle track information
            for files in this season.
          </p>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor={`reanalyze-season-${seasonId}`} className="text-sm cursor-pointer">
              Re-analyze previously analyzed files
            </Label>
            <Switch
              id={`reanalyze-season-${seasonId}`}
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
                Analyze
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
