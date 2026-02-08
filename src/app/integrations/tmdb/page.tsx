'use client';

/**
 * TMDB Integration page
 * Configuration, sync status, and bulk operations for TMDB metadata
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { TmdbMatchDialog } from '@/components/tmdb-match-dialog';
import { TmdbIntegrationHelpDialog } from './tmdb-integration-help-dialog';
import { TaskProgress } from '@/components/task-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateWithFormat, type DateFormat } from '@/lib/settings-shared';
import { getPosterUrl } from '@/lib/tmdb/images';
import { useTasks } from '@/lib/contexts/task-context';

interface EnhancedIntegrationStatus {
  configured: boolean;
  shows: {
    total: number;
    matched: number;
    unmatched: number;
    needsSync: number;
    fullySynced: number;
  };
  seasons: {
    total: number;
    withMetadata: number;
  };
  episodes: {
    total: number;
    withMetadata: number;
  };
  lastSyncedShow: { title: string; syncedAt: string } | null;
}

interface LibraryShow {
  id: number;
  title: string;
  year: number | null;
  tmdbId: number | null;
  posterPath: string | null;
  seasonCount: number;
  seasonsWithMetadata: number;
  episodeCount: number;
  episodesWithMetadata: number;
  syncStatus: 'unmatched' | 'needs-sync' | 'fully-synced';
}

type LibraryFilter = 'all' | 'unmatched' | 'needs-sync' | 'fully-synced';

interface ActiveTask {
  taskId: string;
  type: 'auto-match' | 'refresh-missing' | 'bulk-refresh';
  title: string;
}

export default function TmdbIntegrationPage() {
  const router = useRouter();
  const { tasks: allTasks, refresh: refreshTasks } = useTasks();
  const [status, setStatus] = useState<EnhancedIntegrationStatus | null>(null);
  const [shows, setShows] = useState<LibraryShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [syncingShowId, setSyncingShowId] = useState<number | null>(null);

  // Derive active BULK TMDB task from shared context (running or pending)
  // Excludes single-show tasks (those with custom titles like "TMDB Refresh: Show Name")
  const activeTask = (() => {
    const tmdbTask = allTasks.find(
      (t) =>
        (t.status === 'running' || t.status === 'pending') &&
        t.type.startsWith('tmdb-') &&
        !t.title // Bulk tasks don't have custom titles
    );
    if (tmdbTask) {
      let type: ActiveTask['type'] = 'bulk-refresh';
      let title = 'Refreshing Metadata';
      if (tmdbTask.type === 'tmdb-bulk-match') {
        type = 'auto-match';
        title = 'Auto-Matching Shows';
      } else if (tmdbTask.type === 'tmdb-refresh-missing') {
        type = 'refresh-missing';
        title = 'Syncing Missing Metadata';
      } else if (tmdbTask.type === 'tmdb-bulk-refresh') {
        type = 'bulk-refresh';
        title = 'Refreshing All Metadata';
      }
      // Indicate if queued
      if (tmdbTask.status === 'pending') {
        title = `${title} (Queued)`;
      }
      return { taskId: tmdbTask.taskId, type, title };
    }
    return null;
  })();

  // Get set of show IDs currently being synced (from single-show tasks)
  const syncingShowIds = new Set(
    allTasks
      .filter(
        (t) =>
          (t.status === 'running' || t.status === 'pending') &&
          t.type === 'tmdb-bulk-refresh' &&
          t.title?.startsWith('TMDB Refresh:')
      )
      .map((t) => {
        // Extract show title from "TMDB Refresh: Show Name" and find matching show
        const showTitle = t.title?.replace('TMDB Refresh: ', '');
        const show = shows.find((s) => s.title === showTitle);
        return show?.id;
      })
      .filter((id): id is number => id !== undefined)
  );

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      // Fetch status, settings, and shows in parallel
      const [statusResponse, settingsResponse, showsResponse] = await Promise.all([
        fetch('/api/tmdb/status'),
        fetch('/api/settings'),
        fetch('/api/tv-shows?includeStats=true&limit=100'),
      ]);

      if (!statusResponse.ok) throw new Error('Failed to fetch status');
      const statusData = await statusResponse.json();
      setStatus(statusData);
      setError(null);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setDateFormat(settingsData.dateFormat || 'EU');
      }

      if (showsResponse.ok) {
        const showsData = await showsResponse.json();
        setShows(showsData.shows || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when single-show sync tasks complete
  const prevSyncingCount = useRef(0);
  useEffect(() => {
    // When syncing count drops to 0 from a higher number, tasks completed
    if (syncingShowIds.size === 0 && prevSyncingCount.current > 0 && !loading) {
      fetchData(true);
    }
    prevSyncingCount.current = syncingShowIds.size;
  }, [syncingShowIds.size, loading]);

  // Calculate percentages
  const showMatchPercent = status?.shows.total
    ? Math.round((status.shows.matched / status.shows.total) * 100)
    : 0;
  const seasonSyncPercent = status?.seasons.total
    ? Math.round((status.seasons.withMetadata / status.seasons.total) * 100)
    : 0;
  const episodeSyncPercent = status?.episodes.total
    ? Math.round((status.episodes.withMetadata / status.episodes.total) * 100)
    : 0;

  // Filter shows based on active filter
  const filteredShows = shows.filter((show) => {
    switch (activeFilter) {
      case 'unmatched':
        return show.syncStatus === 'unmatched';
      case 'needs-sync':
        return show.syncStatus === 'needs-sync';
      case 'fully-synced':
        return show.syncStatus === 'fully-synced';
      default:
        return true;
    }
  });

  // Filter counts
  const filterCounts = {
    all: shows.length,
    unmatched: shows.filter((s) => s.syncStatus === 'unmatched').length,
    'needs-sync': shows.filter((s) => s.syncStatus === 'needs-sync').length,
    'fully-synced': shows.filter((s) => s.syncStatus === 'fully-synced').length,
  };

  const handleAutoMatch = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/tmdb/bulk-match', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start auto-match');

      const data = await response.json();
      if (data.taskId) {
        // Refresh task context to pick up the new task immediately
        await refreshTasks();
      } else {
        // No shows to match
        await fetchData(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-match failed');
    }
  }, [refreshTasks]);

  const handleRefreshMissing = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/tmdb/refresh-missing', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start refresh');

      const data = await response.json();
      if (data.taskId) {
        await refreshTasks();
      } else {
        // Nothing to sync
        await fetchData(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh missing failed');
    }
  }, [refreshTasks]);

  const handleBulkRefresh = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/tmdb/bulk-refresh', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start refresh');

      const data = await response.json();
      if (data.taskId) {
        await refreshTasks();
      } else {
        // Nothing to refresh
        await fetchData(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk refresh failed');
    }
  }, [refreshTasks]);

  const handleTaskComplete = useCallback(() => {
    // Refresh data when task completes
    fetchData(true);
  }, []);

  const handleSyncShow = async (showId: number) => {
    if (syncingShowId === showId || syncingShowIds.has(showId)) return;
    setSyncingShowId(showId);
    try {
      const response = await fetch(`/api/tmdb/refresh/${showId}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync show');
      const data = await response.json();
      if (data.taskId) {
        // Refresh task context to pick up the new task
        await refreshTasks();
      }
      // Clear local state - task context will track from here
      setSyncingShowId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      setSyncingShowId(null);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/integrations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">TMDB Integration</h1>
            <p className="text-muted-foreground">
              Enrich your library with metadata from The Movie Database
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <div className="grid gap-4 md:grid-cols-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/integrations">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">TMDB Integration</h1>
          <p className="text-muted-foreground">
            Enrich your library with metadata from The Movie Database
          </p>
        </div>
        <TmdbIntegrationHelpDialog />
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Configuration
            {status?.configured ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="size-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>TMDB API key status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.configured ? (
            <p className="text-sm text-muted-foreground">
              Your TMDB API key is configured and working. You can now match shows and sync
              metadata.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To use TMDB integration, you need to configure your API key:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Create a free account at{' '}
                  <a
                    href="https://www.themoviedb.org/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    themoviedb.org
                    <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>
                  Go to{' '}
                  <a
                    href="https://www.themoviedb.org/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    API Settings
                    <ExternalLink className="size-3" />
                  </a>{' '}
                  and copy your &quot;API Read Access Token&quot;
                </li>
                <li>
                  Add it to your <code className="px-1 py-0.5 rounded bg-muted">.env</code> file:
                  <pre className="mt-2 p-3 rounded bg-muted text-xs overflow-x-auto">
                    TMDB_API_KEY=&quot;your_api_read_access_token&quot;
                  </pre>
                </li>
                <li>Restart the application</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Library Completeness */}
      {status?.configured && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Library Completeness</CardTitle>
              <CardDescription>TMDB matching and metadata sync status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Shows Matched</span>
                    <span>
                      {status.shows.matched} / {status.shows.total}{' '}
                      <span className="text-muted-foreground">({showMatchPercent}%)</span>
                    </span>
                  </div>
                  <Progress value={showMatchPercent} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Seasons with Metadata</span>
                    <span>
                      {status.seasons.withMetadata} / {status.seasons.total}{' '}
                      <span className="text-muted-foreground">({seasonSyncPercent}%)</span>
                    </span>
                  </div>
                  <Progress value={seasonSyncPercent} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Episodes with Metadata</span>
                    <span>
                      {status.episodes.withMetadata} / {status.episodes.total}{' '}
                      <span className="text-muted-foreground">({episodeSyncPercent}%)</span>
                    </span>
                  </div>
                  <Progress value={episodeSyncPercent} className="h-2" />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold">{status.shows.total}</div>
                  <div className="text-sm text-muted-foreground">Total Shows</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-success-foreground">{status.shows.fullySynced}</div>
                  <div className="text-sm text-muted-foreground">Fully Synced</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-warning-foreground">{status.shows.needsSync}</div>
                  <div className="text-sm text-muted-foreground">Needs Sync</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-destructive-foreground">{status.shows.unmatched}</div>
                  <div className="text-sm text-muted-foreground">Unmatched</div>
                </div>
              </div>

              {status.lastSyncedShow && (
                <p className="text-sm text-muted-foreground">
                  Last synced: <strong>{status.lastSyncedShow.title}</strong> on{' '}
                  {formatDateWithFormat(new Date(status.lastSyncedShow.syncedAt), dateFormat)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Actions</CardTitle>
              <CardDescription>Operations for syncing metadata across your library</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active task progress */}
              {activeTask && (
                <TaskProgress
                  taskId={activeTask.taskId}
                  title={activeTask.title}
                  onComplete={handleTaskComplete}
                />
              )}

              {/* Action buttons - disabled when task is running */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleAutoMatch}
                  disabled={status.shows.unmatched === 0 || !!activeTask}
                >
                  <Zap className="size-4 mr-2" />
                  Auto-Match Unmatched ({status.shows.unmatched})
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRefreshMissing}
                  disabled={status.shows.needsSync === 0 || !!activeTask}
                >
                  <RefreshCw className="size-4 mr-2" />
                  Refresh Missing Metadata ({status.shows.needsSync})
                </Button>

                <Button
                  variant="outline"
                  onClick={handleBulkRefresh}
                  disabled={status.shows.matched === 0 || !!activeTask}
                >
                  <RefreshCw className="size-4 mr-2" />
                  Refresh All Metadata ({status.shows.matched})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Library Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Library Overview</CardTitle>
              <CardDescription>View and manage TMDB matching for all shows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'unmatched', label: 'Unmatched' },
                    { key: 'needs-sync', label: 'Needs Sync' },
                    { key: 'fully-synced', label: 'Fully Synced' },
                  ] as const
                ).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={activeFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(key)}
                  >
                    {label} ({filterCounts[key]})
                  </Button>
                ))}
              </div>

              {/* Show list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredShows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No shows match this filter
                  </p>
                ) : (
                  filteredShows.map((show) => (
                    <div
                      key={show.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Poster */}
                      <div className="w-10 h-14 rounded bg-muted flex-shrink-0 overflow-hidden">
                        {show.posterPath ? (
                          <img
                            src={getPosterUrl(show.posterPath, 'w92') ?? undefined}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            ?
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{show.title}</div>
                        <div className="flex items-center gap-2 text-sm">
                          {show.year && (
                            <span className="text-muted-foreground">{show.year}</span>
                          )}

                          {show.syncStatus === 'unmatched' && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="size-3 mr-1" />
                              Not Matched
                            </Badge>
                          )}
                          {show.syncStatus === 'needs-sync' && (
                            <Badge variant="warning" className="text-xs">
                              <AlertTriangle className="size-3 mr-1" />
                              {show.seasonsWithMetadata}/{show.seasonCount} seasons ·{' '}
                              {show.episodesWithMetadata}/{show.episodeCount} episodes
                            </Badge>
                          )}
                          {show.syncStatus === 'fully-synced' && (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Synced
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {show.syncStatus === 'unmatched' ? (
                          <TmdbMatchDialog
                            showId={show.id}
                            showTitle={show.title}
                            showYear={show.year}
                            onMatch={() => fetchData(true)}
                            trigger={
                              <Button variant="outline" size="sm">
                                Match
                              </Button>
                            }
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncShow(show.id)}
                            disabled={syncingShowIds.has(show.id) || syncingShowId === show.id}
                          >
                            {syncingShowIds.has(show.id) || syncingShowId === show.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="size-4 mr-1" />
                                {show.syncStatus === 'fully-synced' ? 'Refresh' : 'Sync'}
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/tv-shows/${show.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {shows.length > 100 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 100 shows.{' '}
                  <Link href="/tv-shows" className="text-primary underline">
                    View all on TV Shows page
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
