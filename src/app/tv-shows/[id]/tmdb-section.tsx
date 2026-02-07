'use client';

/**
 * TMDB Section for TV show detail page
 * Shows TMDB integration status, sync controls, and match options
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TmdbMatchDialog } from '@/components/tmdb-match-dialog';
import { TmdbImportDialog } from '@/components/tmdb-import-dialog';
import { TmdbHelpDialog } from './tmdb-help-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Film,
  RefreshCw,
  Link2,
  Link2Off,
  Download,
  Loader2,
} from 'lucide-react';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { useTasks } from '@/lib/contexts/task-context';

interface SyncStats {
  totalSeasons: number;
  syncedSeasons: number;
  totalEpisodes: number;
  syncedEpisodes: number;
}

interface TmdbSectionProps {
  showId: number;
  showTitle: string;
  showYear?: number | null;
  tmdbId?: number | null;
  lastMetadataSync?: Date | null;
  dateFormat: DateFormat;
  syncStats?: SyncStats;
}

export function TmdbSection({
  showId,
  showTitle,
  showYear,
  tmdbId,
  lastMetadataSync,
  dateFormat,
  syncStats,
}: TmdbSectionProps) {
  const router = useRouter();
  const { tasks, refresh: refreshTasks } = useTasks();
  const [refreshing, setRefreshing] = useState(false);

  // Check if there's a running/pending sync task for this show
  const activeSyncTask = tasks.find(
    (t) =>
      (t.status === 'running' || t.status === 'pending') &&
      t.title?.includes(showTitle) &&
      t.type !== 'tmdb-import'
  );
  const isSyncActive = !!activeSyncTask;
  const isSyncQueued = activeSyncTask?.status === 'pending';

  // Check if there's a running/pending import task for this show
  const activeImportTask = tasks.find(
    (t) =>
      (t.status === 'running' || t.status === 'pending') &&
      t.type === 'tmdb-import' &&
      t.title?.includes(showTitle)
  );
  const isImportActive = !!activeImportTask;
  const isImportQueued = activeImportTask?.status === 'pending';

  // Any task active for this show
  const isTaskActive = isSyncActive || isImportActive;

  const handleMatch = () => {
    router.refresh();
  };

  const handleRefresh = async () => {
    if (!tmdbId || refreshing || isTaskActive) return;

    setRefreshing(true);
    try {
      const response = await fetch(`/api/tmdb/refresh/${showId}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.taskId) {
          // Refresh task context to show new task
          await refreshTasks();
        }
        // Always refresh to show current state
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to refresh metadata:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isMatched = !!tmdbId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="size-5" />
              TMDB Integration
            </CardTitle>
            <TmdbHelpDialog />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isMatched ? 'default' : 'secondary'}>
              {isMatched ? (
                <>
                  <Link2 className="size-3 mr-1" />
                  Matched
                </>
              ) : (
                <>
                  <Link2Off className="size-3 mr-1" />
                  Unmatched
                </>
              )}
            </Badge>
            {isMatched && tmdbId && (
              <a
                href={`https://www.themoviedb.org/tv/${tmdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-muted-foreground hover:text-primary hover:underline"
              >
                #{tmdbId}
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isMatched ? (
          <>
            {/* Sync Stats */}
            {syncStats && (syncStats.totalSeasons > 0 || syncStats.totalEpisodes > 0) && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Seasons:</span>
                  <span className={syncStats.syncedSeasons === syncStats.totalSeasons ? 'text-green-600' : 'text-amber-600'}>
                    {syncStats.syncedSeasons}/{syncStats.totalSeasons} synced
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Episodes:</span>
                  <span className={syncStats.syncedEpisodes === syncStats.totalEpisodes ? 'text-green-600' : 'text-amber-600'}>
                    {syncStats.syncedEpisodes}/{syncStats.totalEpisodes} synced
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {/* Sync Metadata */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || isTaskActive}
                >
                  {(refreshing || isSyncActive) ? (
                    <Loader2 className="size-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4 mr-1" />
                  )}
                  {isSyncQueued ? 'Queued...' : isSyncActive ? 'Syncing...' : 'Sync Metadata'}
                </Button>

                {/* Fix Match */}
                <TmdbMatchDialog
                  showId={showId}
                  showTitle={showTitle}
                  showYear={showYear}
                  currentTmdbId={tmdbId}
                  onMatch={handleMatch}
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Link2 className="size-4 mr-1" />
                      Fix Match
                    </Button>
                  }
                />

                {/* Import Seasons & Episodes */}
                <TmdbImportDialog
                  showId={showId}
                  showTitle={showTitle}
                  tmdbId={tmdbId}
                  onImport={handleMatch}
                  trigger={
                    <Button variant="outline" size="sm" disabled={isTaskActive}>
                      {isImportActive ? (
                        <Loader2 className="size-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="size-4 mr-1" />
                      )}
                      {isImportQueued ? 'Queued...' : isImportActive ? 'Importing...' : 'Import Seasons & Episodes'}
                    </Button>
                  }
                />
              </div>

              {/* Last Sync */}
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {lastMetadataSync
                  ? `Last synced on ${formatDateTimeWithFormat(lastMetadataSync, dateFormat)}`
                  : 'Never synced'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {/* Match to TMDB */}
            <TmdbMatchDialog
              showId={showId}
              showTitle={showTitle}
              showYear={showYear}
              onMatch={handleMatch}
              trigger={
                <Button size="sm">
                  <Link2 className="size-4 mr-1" />
                  Match to TMDB
                </Button>
              }
            />
            <p className="text-sm text-muted-foreground">
              Match this show to fetch metadata from TMDB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
