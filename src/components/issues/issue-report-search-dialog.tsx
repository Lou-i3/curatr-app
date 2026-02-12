'use client';

/**
 * Issue Report with Episode Search — for reporting issues from the issues page
 * Step 1: Search for a show, expand to load seasons/episodes, pick an episode
 * Step 2: Standard issue type/context selection with platform chips
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Search, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ISSUE_TYPE_LABELS, ISSUE_TYPES } from '@/lib/issue-utils';
import type { IssueType } from '@/generated/prisma/client';

interface ShowResult {
  id: number;
  title: string;
  year: number | null;
}

interface SeasonData {
  id: number;
  seasonNumber: number;
  episodes: {
    id: number;
    episodeNumber: number;
    title: string | null;
  }[];
}

interface SelectedEpisode {
  id: number;
  label: string;
}

export function IssueReportSearchDialog({ onSubmitted }: { onSubmitted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [shows, setShows] = useState<ShowResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedShow, setExpandedShow] = useState<number | null>(null);
  const [showSeasons, setShowSeasons] = useState<Record<number, SeasonData[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<number | null>(null);

  // Step 2 state
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisode | null>(null);
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Platform list from API
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Fetch platforms when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch('/api/platforms')
      .then((r) => r.json())
      .then((data) => setPlatforms(data.map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, [open]);

  const reset = useCallback(() => {
    setQuery('');
    setShows([]);
    setExpandedShow(null);
    setShowSeasons({});
    setLoadingEpisodes(null);
    setSelectedEpisode(null);
    setSelectedType(null);
    setSelectedPlatform(null);
    setDescription('');
    setShowDetails(false);
  }, []);

  const searchShows = useCallback(async (q: string) => {
    if (q.length < 2) {
      setShows([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/tv-shows?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setShows(data.shows || []);
    } catch {
      // Silently fail
    } finally {
      setSearching(false);
    }
  }, []);

  /** Fetch seasons/episodes for a show when expanded */
  const loadEpisodes = useCallback(async (showId: number) => {
    if (showSeasons[showId]) return; // Already loaded
    setLoadingEpisodes(showId);
    try {
      const response = await fetch(`/api/tv-shows/${showId}/episodes`);
      if (!response.ok) throw new Error('Failed to load episodes');
      const seasons: SeasonData[] = await response.json();
      setShowSeasons((prev) => ({ ...prev, [showId]: seasons }));
    } catch {
      toast.error('Failed to load episodes');
    } finally {
      setLoadingEpisodes(null);
    }
  }, [showSeasons]);

  const handleExpandShow = useCallback((showId: number) => {
    if (expandedShow === showId) {
      setExpandedShow(null);
    } else {
      setExpandedShow(showId);
      loadEpisodes(showId);
    }
  }, [expandedShow, loadEpisodes]);

  const handleSubmit = useCallback(async () => {
    if (!selectedEpisode || !selectedType) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          type: selectedType,
          description: description.trim() || null,
          platform: selectedPlatform,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit issue');
      }
      toast.success('Issue reported — thanks!');
      setOpen(false);
      reset();
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit issue');
    } finally {
      setSubmitting(false);
    }
  }, [selectedEpisode, selectedType, description, selectedPlatform, reset, onSubmitted]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <AlertTriangle className="size-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            {selectedEpisode ? selectedEpisode.label : 'Search for a show and select an episode'}
          </DialogDescription>
        </DialogHeader>

        {!selectedEpisode ? (
          /* Step 1: Episode search and selection */
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search shows..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchShows(e.target.value);
                }}
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {shows.length > 0 && (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {shows.map((show) => {
                  const seasons = showSeasons[show.id];
                  const isExpanded = expandedShow === show.id;
                  const isLoading = loadingEpisodes === show.id;

                  return (
                    <div key={show.id}>
                      <button
                        onClick={() => handleExpandShow(show.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left text-sm"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ChevronRight className={`size-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        )}
                        <span className="font-medium">{show.title}</span>
                        {show.year && (
                          <span className="text-xs text-muted-foreground">({show.year})</span>
                        )}
                      </button>

                      {isExpanded && seasons && seasons.length > 0 && (
                        <div className="ml-6 space-y-0.5">
                          {seasons.map((season) => (
                            <div key={season.id}>
                              <p className="text-xs text-muted-foreground px-3 py-1 font-medium">
                                Season {season.seasonNumber}
                              </p>
                              {season.episodes.map((ep) => {
                                const label = `${show.title} — S${String(season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
                                return (
                                  <button
                                    key={ep.id}
                                    onClick={() => setSelectedEpisode({ id: ep.id, label })}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent text-left text-sm"
                                  >
                                    <span className="font-mono text-xs text-muted-foreground w-8">
                                      E{String(ep.episodeNumber).padStart(2, '0')}
                                    </span>
                                    <span className="truncate">{ep.title || 'Untitled'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && seasons && seasons.length === 0 && (
                        <p className="ml-6 px-3 py-2 text-xs text-muted-foreground">No episodes found</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {query.length >= 2 && !searching && shows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No shows found</p>
            )}
          </div>
        ) : (
          /* Step 2: Issue type and details */
          <div className="space-y-5 py-2">
            <button
              onClick={() => setSelectedEpisode(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Change episode
            </button>

            {/* Type selection */}
            <div>
              <p className="text-sm font-medium mb-2">What&apos;s the problem?</p>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedType === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {ISSUE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform selection (shown after type selected) */}
            {selectedType && platforms.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Platform</p>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatform(selectedPlatform === p ? null : p)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        selectedPlatform === p
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional details */}
            {selectedType && (
              <div>
                {!showDetails ? (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add more details
                  </button>
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in more detail..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    rows={3}
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Summary */}
            {selectedType && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">{ISSUE_TYPE_LABELS[selectedType]}</Badge>
                {selectedPlatform && <Badge variant="secondary">{selectedPlatform}</Badge>}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedType || submitting}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
