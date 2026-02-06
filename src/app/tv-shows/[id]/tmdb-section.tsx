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

interface TmdbSectionProps {
  showId: number;
  showTitle: string;
  showYear?: number | null;
  tmdbId?: number | null;
  lastMetadataSync?: Date | null;
  dateFormat: DateFormat;
}

export function TmdbSection({
  showId,
  showTitle,
  showYear,
  tmdbId,
  lastMetadataSync,
  dateFormat,
}: TmdbSectionProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleMatch = () => {
    router.refresh();
  };

  const handleRefresh = async () => {
    if (!tmdbId || refreshing) return;

    setRefreshing(true);
    try {
      const response = await fetch(`/api/tmdb/refresh/${showId}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        // Task started in background - visible in sidebar
        // Refresh page after a delay to show updated metadata
        if (data.taskId) {
          setTimeout(() => {
            router.refresh();
            setRefreshing(false);
          }, 2000);
          return; // Don't set refreshing=false yet, wait for timeout
        }
        router.refresh();
        setRefreshing(false);
      } else {
        setRefreshing(false);
      }
    } catch (error) {
      console.error('Failed to refresh metadata:', error);
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
      <CardContent>
        {isMatched ? (
          <div className="flex items-center justify-between gap-4">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Sync Metadata */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="size-4 mr-1" />
                )}
                Sync Metadata
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
                  <Button variant="outline" size="sm">
                    <Download className="size-4 mr-1" />
                    Import Seasons & Episodes
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
