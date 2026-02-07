'use client';

/**
 * Sync button for the show detail page
 * Triggers a scan of just this show's folder
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
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
import { useTasks } from '@/lib/contexts/task-context';

interface ShowSyncButtonProps {
  show: {
    id: number;
    title: string;
    folderName: string | null;
  };
}

export function ShowSyncButton({ show }: ShowSyncButtonProps) {
  const router = useRouter();
  const { tasks, refresh: refreshTasks } = useTasks();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check if there's already a sync task for this show
  const activeSyncTask = tasks.find(
    (t) =>
      t.type === 'show-sync' &&
      (t.status === 'running' || t.status === 'pending') &&
      t.title === `Sync: ${show.title}`
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
            <RefreshCw className="size-4 mr-1" />
          )}
          {isSyncQueued ? 'Queued...' : isSyncActive ? 'Syncing...' : 'Sync'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Files for {show.title}</DialogTitle>
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
            <p>The sync will:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Discover new video files in this folder</li>
              <li>Update file information for existing files</li>
              <li>Mark files as deleted if they no longer exist</li>
            </ul>
          </div>
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
                <RefreshCw className="size-4 mr-1" />
                Start Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
