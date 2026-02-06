'use client';

/**
 * TMDB actions for TV show detail page
 * Client component wrapper for match dialog with refresh capability
 */

import { useRouter } from 'next/navigation';
import { TmdbMatchDialog } from '@/components/tmdb-match-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, RefreshCw, ExternalLink } from 'lucide-react';

interface TmdbActionsProps {
  showId: number;
  showTitle: string;
  showYear?: number | null;
  tmdbId?: number | null;
}

export function TmdbActions({ showId, showTitle, showYear, tmdbId }: TmdbActionsProps) {
  const router = useRouter();

  const handleMatch = () => {
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      {tmdbId ? (
        <>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.themoviedb.org/tv/${tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Film className="size-4 mr-1" />
              TMDB: {tmdbId}
              <ExternalLink className="size-3 ml-1" />
            </a>
          </Button>
          <TmdbMatchDialog
            showId={showId}
            showTitle={showTitle}
            showYear={showYear}
            currentTmdbId={tmdbId}
            onMatch={handleMatch}
            trigger={
              <Button variant="ghost" size="sm">
                <RefreshCw className="size-4 mr-1" />
                Fix Match
              </Button>
            }
          />
        </>
      ) : (
        <TmdbMatchDialog
          showId={showId}
          showTitle={showTitle}
          showYear={showYear}
          onMatch={handleMatch}
          trigger={
            <Button variant="outline" size="sm">
              <Film className="size-4 mr-1" />
              Match to TMDB
            </Button>
          }
        />
      )}
    </div>
  );
}
