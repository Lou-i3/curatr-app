'use client';

/**
 * TMDB Integration page
 * Configuration, sync status, and bulk operations for TMDB metadata
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Zap, ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateWithFormat, type DateFormat } from '@/lib/settings-shared';

interface IntegrationStatus {
  configured: boolean;
  totalShows: number;
  matchedShows: number;
  unmatchedShows: number;
  lastSyncedShow: { title: string; syncedAt: string } | null;
}

interface UnmatchedShow {
  id: number;
  title: string;
  year: number | null;
}

interface BulkMatchResult {
  matched: number;
  skipped: number;
  total: number;
}

export default function TmdbIntegrationPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [unmatchedShows, setUnmatchedShows] = useState<UnmatchedShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkMatchResult | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      // Fetch status and settings in parallel
      const [statusResponse, settingsResponse] = await Promise.all([
        fetch('/api/tmdb/status'),
        fetch('/api/settings'),
      ]);

      if (!statusResponse.ok) throw new Error('Failed to fetch status');
      const data = await statusResponse.json();
      setStatus(data);
      setError(null);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setDateFormat(settingsData.dateFormat || 'EU');
      }

      // Fetch unmatched shows if configured
      if (data.configured && data.unmatchedShows > 0) {
        const showsResponse = await fetch('/api/tv-shows?unmatched=true&limit=10');
        if (showsResponse.ok) {
          const showsData = await showsResponse.json();
          setUnmatchedShows(showsData.shows || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const matchPercentage = status?.totalShows
    ? Math.round((status.matchedShows / status.totalShows) * 100)
    : 0;

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    setBulkResult(null);
    setError(null);

    try {
      const response = await fetch('/api/tmdb/bulk-match', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to run auto-match');

      const data = await response.json();
      setBulkResult({
        matched: data.matched,
        skipped: data.skipped,
        total: data.total,
      });

      // Refresh status after matching
      await fetchStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-match failed');
    } finally {
      setAutoMatching(false);
    }
  };

  // Loading skeleton
  if (loading) {
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
        </div>

        {/* Loading skeletons */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-2 w-full" />
            <div className="grid gap-4 md:grid-cols-3">
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
        <Button variant="outline" size="sm" onClick={() => fetchStatus(true)} disabled={refreshing}>
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
              <Badge variant="default" className="bg-green-600">
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
          <CardDescription>
            TMDB API key status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.configured ? (
            <p className="text-sm text-muted-foreground">
              Your TMDB API key is configured and working. You can now match shows and sync metadata.
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

      {/* Sync Status */}
      {status?.configured && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                Overview of matched shows in your library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {status.matchedShows} of {status.totalShows} shows matched
                </span>
                <span className="font-medium">{matchPercentage}%</span>
              </div>
              <Progress value={matchPercentage} className="h-2" />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold">{status.totalShows}</div>
                  <div className="text-sm text-muted-foreground">Total Shows</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{status.matchedShows}</div>
                  <div className="text-sm text-muted-foreground">Matched</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{status.unmatchedShows}</div>
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
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Bulk operations for syncing metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleAutoMatch}
                  disabled={status.unmatchedShows === 0 || autoMatching}
                >
                  {autoMatching ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="size-4 mr-2" />
                  )}
                  {autoMatching ? 'Matching...' : `Auto-Match Unmatched (${status.unmatchedShows})`}
                </Button>
                <Button variant="outline" disabled={status.matchedShows === 0}>
                  <RefreshCw className="size-4 mr-2" />
                  Refresh All Metadata
                </Button>
              </div>

              {bulkResult && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="font-medium text-green-600">
                    Auto-match complete!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Matched {bulkResult.matched} of {bulkResult.total} shows.
                    {bulkResult.skipped > 0 && (
                      <> {bulkResult.skipped} skipped (low confidence or errors).</>
                    )}
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Auto-match will attempt to find TMDB matches for shows based on title and year.
                Shows with low confidence matches will be skipped and can be matched manually.
              </p>
            </CardContent>
          </Card>

          {/* Unmatched Shows */}
          {status.unmatchedShows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unmatched Shows ({status.unmatchedShows})</CardTitle>
                <CardDescription>
                  These shows need to be matched to TMDB manually or via auto-match
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unmatchedShows.length > 0 ? (
                  <div className="space-y-2">
                    {unmatchedShows.map((show) => (
                      <div
                        key={show.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <span className="font-medium">{show.title}</span>
                          {show.year && (
                            <span className="text-muted-foreground ml-2">({show.year})</span>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tv-shows/${show.id}`}>Match</Link>
                        </Button>
                      </div>
                    ))}
                    {status.unmatchedShows > unmatchedShows.length && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        And {status.unmatchedShows - unmatchedShows.length} more...{' '}
                        <Link href="/tv-shows?filter=unmatched" className="text-primary underline">
                          View all
                        </Link>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Visit the{' '}
                    <Link href="/tv-shows" className="text-primary underline">
                      TV Shows page
                    </Link>{' '}
                    to match individual shows to TMDB.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
