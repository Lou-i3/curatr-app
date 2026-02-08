'use client';

/**
 * Scan button for the show detail page
 * Triggers a scan of just this show's folder
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanSearch, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTasks } from '@/lib/contexts/task-context';
import { UpdateRulesHelpSection } from '@/components/scan-help-content';

interface ShowScanButtonProps {
  show: {
    id: number;
    title: string;
    folderName: string | null;
  };
}

export function ShowScanButton({ show }: ShowScanButtonProps) {
  const router = useRouter();
  const { tasks, refresh: refreshTasks } = useTasks();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Check if there's already a sync task for this show
  const activeSyncTask = tasks.find(
    (t) =>
      t.type === 'show-scan' &&
      (t.status === 'running' || t.status === 'pending') &&
      t.title === `Scan: ${show.title}`
  );
  const isSyncActive = !!activeSyncTask;
  const isSyncQueued = activeSyncTask?.status === 'pending';

  const handleSync = async () => {
    if (syncing || isSyncActive) return;

    setSyncing(true);
    try {
      const response = await fetch(`/api/tv-shows/${show.id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start sync');
      }

      // Close dialog and refresh task context
      setOpen(false);
      await refreshTasks();

      // Refresh page after a delay to show updated data
      setTimeout(() => router.refresh(), 2000);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Don't show button if no folder name
  if (!show.folderName) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSyncActive}>
          {isSyncActive ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <ScanSearch className="size-4 mr-1" />
          )}
          {isSyncQueued ? 'Queued...' : isSyncActive ? 'Scanning...' : 'Scan'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Files for {show.title}</DialogTitle>
          <DialogDescription>
            This will scan the show&apos;s folder to discover new files and
            detect removed files.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium">Folder:</span>{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {show.folderName}
            </code>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>The scan will:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Discover new video files in this folder</li>
              <li>Create new seasons and episodes for any new files found</li>
              <li>Update file information if size or date changed</li>
              <li>Mark files as deleted if they no longer exist on disk</li>
            </ul>
            <p className="mt-2 text-xs">
              Only this show is affected — other shows remain unchanged.
            </p>
          </div>

          <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                <span>What gets updated?</span>
                <ChevronDown className={`size-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <UpdateRulesHelpSection compact />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <ScanSearch className="size-4 mr-1" />
                Start Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
