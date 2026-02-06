'use client';

/**
 * TMDB Match Dialog
 * Search and match a TV show to TMDB
 */

import { useState, useEffect } from 'react';
import { Search, Loader2, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TMDBSearchResult {
  tmdbShow: {
    id: number;
    name: string;
    original_name: string;
    overview: string;
    poster_path: string | null;
    first_air_date: string;
    vote_average: number;
  };
  confidence: number;
  matchReasons: string[];
}

interface TmdbMatchDialogProps {
  showId: number;
  showTitle: string;
  showYear?: number | null;
  currentTmdbId?: number | null;
  onMatch?: () => void;
  trigger?: React.ReactNode;
}

export function TmdbMatchDialog({
  showId,
  showTitle,
  showYear,
  currentTmdbId,
  onMatch,
  trigger,
}: TmdbMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(showTitle);
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [matching, setMatching] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search when dialog opens or query changes
  useEffect(() => {
    if (!open) return;

    const searchTimer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: query });
        if (showYear) params.set('year', showYear.toString());

        const response = await fetch(`/api/tmdb/search?${params}`);
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [open, query, showYear]);

  const handleMatch = async (tmdbId: number) => {
    setMatching(tmdbId);
    setError(null);

    try {
      const response = await fetch('/api/tmdb/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, tmdbId, syncSeasons: true }),
      });

      if (!response.ok) throw new Error('Failed to match show');

      setOpen(false);
      onMatch?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match failed');
    } finally {
      setMatching(null);
    }
  };

  const handleUnmatch = async () => {
    setMatching(-1);
    setError(null);

    try {
      const response = await fetch('/api/tmdb/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, tmdbId: null }),
      });

      if (!response.ok) throw new Error('Failed to unmatch show');

      setOpen(false);
      onMatch?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unmatch failed');
    } finally {
      setMatching(null);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge className="bg-green-600">High Match</Badge>;
    if (confidence >= 50) return <Badge variant="secondary">Possible</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {currentTmdbId ? 'Change Match' : 'Match to TMDB'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Match to TMDB</DialogTitle>
          <DialogDescription>
            Search for &quot;{showTitle}&quot; on The Movie Database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search TMDB..."
              className="pl-10"
            />
          </div>

          {/* Current match */}
          {currentTmdbId && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <span className="text-sm">
                Currently matched to TMDB ID: <strong>{currentTmdbId}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnmatch}
                disabled={matching !== null}
              >
                {matching === -1 ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Unmatch'
                )}
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              results.map((result) => (
                <div
                  key={result.tmdbShow.id}
                  className="flex gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  {/* Poster */}
                  <div className="w-16 h-24 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {result.tmdbShow.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.tmdbShow.poster_path}`}
                        alt={result.tmdbShow.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium leading-tight">{result.tmdbShow.name}</h4>
                        {result.tmdbShow.first_air_date && (
                          <p className="text-sm text-muted-foreground">
                            {result.tmdbShow.first_air_date.substring(0, 4)}
                          </p>
                        )}
                      </div>
                      {getConfidenceBadge(result.confidence)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {result.tmdbShow.overview || 'No description available'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleMatch(result.tmdbShow.id)}
                        disabled={matching !== null}
                      >
                        {matching === result.tmdbShow.id ? (
                          <Loader2 className="size-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="size-4 mr-1" />
                        )}
                        Match
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://www.themoviedb.org/tv/${result.tmdbShow.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-4 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : query.trim() && !searching ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
