'use client';

/**
 * TMDB Section for TV show detail page
 * Shows TMDB integration status, sync controls, and match options
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TmdbMatchDialog } from '@/components/tmdb-match-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Film,
  RefreshCw,
  ExternalLink,
  Link2,
  Link2Off,
  Download,
  Loader2,
} from 'lucide-react';
import { formatDateWithFormat, type DateFormat } from '@/lib/settings-shared';

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
    if (!tmdbId) return;

    setRefreshing(true);
    try {
      const response = await fetch(`/api/tmdb/refresh/${showId}`, {
        method: 'POST',
      });
      if (response.ok) {
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Film className="size-5" />
            TMDB Integration
          </CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">TMDB ID</p>
            <p className="font-medium font-mono">
              {tmdbId || <span className="text-muted-foreground">—</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Sync</p>
            <p className="font-medium">
              {lastMetadataSync
                ? formatDateWithFormat(lastMetadataSync, dateFormat)
                : <span className="text-muted-foreground">Never</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {isMatched ? (
            <>
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

              {/* View on TMDB */}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.themoviedb.org/tv/${tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4 mr-1" />
                  View on TMDB
                </a>
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
              <Button variant="outline" size="sm" disabled>
                <Download className="size-4 mr-1" />
                Import Seasons & Episodes
              </Button>
            </>
          ) : (
            <>
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
              <p className="text-sm text-muted-foreground self-center">
                Match this show to fetch metadata from TMDB
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
