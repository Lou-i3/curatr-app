'use client';

/**
 * Unified Issue Report Dialog
 * Combines episode search/selection with issue type/context selection.
 * Works from both episode pages (pre-filled) and issues page (search-based).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ISSUE_TYPE_LABELS, ISSUE_TYPES, ISSUE_SUB_TYPES, ISSUE_SUB_TYPE_LABELS, TYPES_WITH_SUB_TYPE, type IssueSubType } from '@/lib/issue-utils';
import { getPosterUrl } from '@/lib/tmdb/images';
import { getLanguageName } from '@/lib/languages';
import type { IssueType } from '@/generated/prisma/client';

export interface SelectedEpisode {
  id: number;
  label: string;
  showId: number;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
}

interface ShowResult {
  id: number;
  title: string;
  year: number | null;
  posterPath: string | null;
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

interface IssueReportDialogProps {
  /** Pre-selected episodes (from episode page context) */
  initialEpisodes?: SelectedEpisode[];
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Callback after successful submission */
  onSubmitted?: () => void;
}

type DialogStep = 'search' | 'pick' | 'details';

export function IssueReportDialog({
  initialEpisodes,
  trigger,
  onSubmitted,
}: IssueReportDialogProps) {
  const [open, setOpen] = useState(false);

  // Episode selection state
  const [step, setStep] = useState<DialogStep>(initialEpisodes?.length ? 'details' : 'search');
  const [query, setQuery] = useState('');
  const [shows, setShows] = useState<ShowResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowResult | null>(null);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [selectedEpisodes, setSelectedEpisodes] = useState<SelectedEpisode[]>(
    initialEpisodes || []
  );

  // Issue details state
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<IssueSubType | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAudioLang, setSelectedAudioLang] = useState<string | null>(null);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Context data
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [audioLanguages, setAudioLanguages] = useState<string[]>([]);
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    setStep(initialEpisodes?.length ? 'details' : 'search');
    setQuery('');
    setShows([]);
    setSelectedShow(null);
    setSeasons([]);
    setExpandedSeasons(new Set());
    setSelectedEpisodes(initialEpisodes || []);
    setSelectedType(null);
    setSelectedSubType(null);
    setSelectedPlatform(null);
    setSelectedAudioLang(null);
    setSelectedSubtitleLang(null);
    setDescription('');
    setShowDetails(false);
    setAudioLanguages([]);
    setSubtitleLanguages([]);
  }, [initialEpisodes]);

  // Fetch platforms when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch('/api/platforms')
      .then((r) => r.json())
      .then((data) => setPlatforms(data.map((p: { name: string }) => p.name)))
      .catch(() => {});
  }, [open]);

  // Fetch languages when episodes change or dialog opens
  useEffect(() => {
    if (!open || selectedEpisodes.length === 0) {
      if (!open) return; // Don't clear when closed — reset() handles that
      setAudioLanguages([]);
      setSubtitleLanguages([]);
      return;
    }
    const ids = selectedEpisodes.map((e) => e.id).join(',');
    fetch(`/api/episodes/languages?ids=${ids}`)
      .then((r) => r.json())
      .then((data) => {
        setAudioLanguages(data.audioLanguages || []);
        setSubtitleLanguages(data.subtitleLanguages || []);
      })
      .catch(() => {});
  }, [open, selectedEpisodes, step]);

  // Search shows with debounce
  const searchShows = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) {
      setShows([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
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
    }, 300);
  }, []);

  // Load seasons for selected show
  const loadSeasons = useCallback(async (showId: number) => {
    setLoadingSeasons(true);
    try {
      const response = await fetch(`/api/tv-shows/${showId}/episodes`);
      if (!response.ok) throw new Error('Failed to load');
      const data: SeasonData[] = await response.json();
      setSeasons(data);
    } catch {
      toast.error('Failed to load episodes');
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  // Handle show selection (drill-down)
  const handleShowSelect = useCallback(
    (show: ShowResult) => {
      setSelectedShow(show);
      setStep('pick');
      loadSeasons(show.id);
    },
    [loadSeasons]
  );

  // Toggle season expansion
  const toggleSeason = useCallback((seasonNumber: number) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) next.delete(seasonNumber);
      else next.add(seasonNumber);
      return next;
    });
  }, []);

  // Toggle single episode selection
  const toggleEpisode = useCallback(
    (episode: SeasonData['episodes'][0], season: SeasonData) => {
      if (!selectedShow) return;
      const ep: SelectedEpisode = {
        id: episode.id,
        label: `${selectedShow.title} — S${String(season.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`,
        showId: selectedShow.id,
        showTitle: selectedShow.title,
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
      };

      setSelectedEpisodes((prev) => {
        const exists = prev.some((e) => e.id === episode.id);
        if (exists) return prev.filter((e) => e.id !== episode.id);
        return [...prev, ep];
      });
    },
    [selectedShow]
  );

  // Select/deselect all episodes in a season
  const toggleSeason_selectAll = useCallback(
    (season: SeasonData) => {
      if (!selectedShow) return;
      const seasonEpisodeIds = new Set(season.episodes.map((e) => e.id));
      const allSelected = season.episodes.every((e) =>
        selectedEpisodes.some((se) => se.id === e.id)
      );

      if (allSelected) {
        // Deselect all from this season
        setSelectedEpisodes((prev) => prev.filter((e) => !seasonEpisodeIds.has(e.id)));
      } else {
        // Select all from this season
        const newEpisodes = season.episodes
          .filter((e) => !selectedEpisodes.some((se) => se.id === e.id))
          .map((e) => ({
            id: e.id,
            label: `${selectedShow.title} — S${String(season.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}`,
            showId: selectedShow.id,
            showTitle: selectedShow.title,
            seasonNumber: season.seasonNumber,
            episodeNumber: e.episodeNumber,
          }));
        setSelectedEpisodes((prev) => [...prev, ...newEpisodes]);
      }
    },
    [selectedShow, selectedEpisodes]
  );

  const removeEpisode = useCallback((episodeId: number) => {
    setSelectedEpisodes((prev) => prev.filter((e) => e.id !== episodeId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || selectedEpisodes.length === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeIds: selectedEpisodes.map((e) => e.id),
          type: selectedType,
          subType: selectedSubType,
          description: description.trim() || null,
          platform: selectedPlatform,
          audioLang: selectedAudioLang,
          subtitleLang: selectedSubtitleLang,
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
  }, [
    selectedType,
    selectedSubType,
    selectedEpisodes,
    description,
    selectedPlatform,
    selectedAudioLang,
    selectedSubtitleLang,
    reset,
    onSubmitted,
  ]);

  // Compute selected count per season for badge display
  const getSeasonSelectedCount = useCallback(
    (season: SeasonData) => {
      return season.episodes.filter((e) => selectedEpisodes.some((se) => se.id === e.id)).length;
    },
    [selectedEpisodes]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            Report Issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Search for a show to get started'}
            {step === 'pick' && selectedShow?.title}
            {step === 'details' && `${selectedEpisodes.length} episode${selectedEpisodes.length !== 1 ? 's' : ''} selected`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Show Search */}
        {step === 'search' && (
          <div className="space-y-4 py-2 overflow-y-auto min-h-0">
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

            {/* Selected episodes chips (if coming back from pick/details) */}
            {selectedEpisodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selected episodes</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEpisodes.map((ep) => (
                    <Badge key={ep.id} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">
                        S{String(ep.seasonNumber).padStart(2, '0')}E
                        {String(ep.episodeNumber).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => removeEpisode(ep.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => setStep('details')}
                  disabled={selectedEpisodes.length === 0}
                >
                  Continue
                </Button>
              </div>
            )}

            {shows.length > 0 && (
              <div className="space-y-1">
                {shows.map((show) => (
                  <button
                    key={show.id}
                    onClick={() => handleShowSelect(show)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left text-sm"
                  >
                    {show.posterPath ? (
                      <img
                        src={getPosterUrl(show.posterPath, 'w92')}
                        alt=""
                        className="w-8 h-12 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-12 rounded bg-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{show.title}</span>
                      {show.year && (
                        <span className="text-xs text-muted-foreground">{show.year}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && !searching && shows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No shows found</p>
            )}
          </div>
        )}

        {/* Step 2: Season/Episode Picker */}
        {step === 'pick' && (
          <div className="flex flex-col min-h-0 py-2 gap-4">
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedShow(null);
                setSeasons([]);
                setExpandedSeasons(new Set());
                setStep('search');
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              Back to search
            </button>

            {/* Selected episodes chips */}
            {selectedEpisodes.length > 0 && (
              <div className="shrink-0">
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {selectedEpisodes.map((ep) => (
                    <Badge key={ep.id} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs whitespace-normal">
                        {ep.showTitle !== selectedShow?.title
                          ? `${ep.showTitle} `
                          : ''}
                        S{String(ep.seasonNumber).padStart(2, '0')}E
                        {String(ep.episodeNumber).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => removeEpisode(ep.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted shrink-0"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable season/episode list */}
            {loadingSeasons ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : seasons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No episodes found</p>
            ) : (
              <div className="space-y-1 overflow-y-auto min-h-0 flex-1">
                {seasons.map((season) => {
                  const isExpanded = expandedSeasons.has(season.seasonNumber);
                  const selectedCount = getSeasonSelectedCount(season);
                  const allSelected =
                    season.episodes.length > 0 && selectedCount === season.episodes.length;

                  return (
                    <div key={season.id}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
                        {/* Season expand/collapse */}
                        <button
                          onClick={() => toggleSeason(season.seasonNumber)}
                          className="flex items-center gap-2 flex-1 text-left text-sm"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0" />
                          )}
                          <span className="font-medium">Season {season.seasonNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {season.episodes.length} ep{season.episodes.length !== 1 ? 's' : ''}
                          </span>
                          {selectedCount > 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {selectedCount}
                            </Badge>
                          )}
                        </button>
                        {/* Select all checkbox */}
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleSeason_selectAll(season)}
                          aria-label={`Select all episodes in Season ${season.seasonNumber}`}
                        />
                      </div>

                      {isExpanded && (
                        <div className="ml-3 md:ml-6 space-y-0.5">
                          {season.episodes.map((ep) => {
                            const isSelected = selectedEpisodes.some((se) => se.id === ep.id);
                            return (
                              <div
                                key={ep.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleEpisode(ep, season)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleEpisode(ep, season);
                                  }
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent'
                                    : 'hover:bg-accent/50'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  tabIndex={-1}
                                  className="pointer-events-none shrink-0"
                                />
                                <span className="font-mono text-xs text-muted-foreground shrink-0">
                                  E{String(ep.episodeNumber).padStart(2, '0')}
                                </span>
                                <span className="flex-1 min-w-0">
                                  {ep.title || 'Untitled'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Continue button — always visible */}
            <Button
              onClick={() => setStep('details')}
              disabled={selectedEpisodes.length === 0}
              className="w-full shrink-0"
            >
              Continue ({selectedEpisodes.length} selected)
            </Button>
          </div>
        )}

        {/* Step 3: Issue Details */}
        {step === 'details' && (
          <div className="flex flex-col min-h-0 py-2 gap-5">
            {/* Scrollable content */}
            <div className="overflow-y-auto min-h-0 flex-1 space-y-5">
            {/* Selected episodes chips */}
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedEpisodes.map((ep) => (
                  <Badge key={ep.id} variant="secondary" className="gap-1 pr-1">
                    <span className="text-xs whitespace-normal">{ep.label}</span>
                    <button
                      onClick={() => removeEpisode(ep.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <button
                onClick={() => setStep('search')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                + Add more episodes
              </button>
            </div>

            {/* Type selection */}
            <div>
              <p className="text-sm font-medium mb-2">What&apos;s the problem?</p>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      if (!TYPES_WITH_SUB_TYPE.includes(type)) setSelectedSubType(null);
                    }}
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

            {/* Sub-type selection (only for AUDIO/SUBTITLE) */}
            {selectedType && TYPES_WITH_SUB_TYPE.includes(selectedType) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">What&apos;s the issue?</p>
                <div className="flex flex-wrap gap-1.5">
                  {ISSUE_SUB_TYPES.map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedSubType(selectedSubType === st ? null : st)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        selectedSubType === st
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {ISSUE_SUB_TYPE_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context options (shown after type selected) */}
            {selectedType && (
              <div className="space-y-3">
                {platforms.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Platform</p>
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setSelectedPlatform(selectedPlatform === p ? null : p)
                          }
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

                {audioLanguages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Audio language</p>
                    <div className="flex flex-wrap gap-1.5">
                      {audioLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() =>
                            setSelectedAudioLang(selectedAudioLang === lang ? null : lang)
                          }
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            selectedAudioLang === lang
                              ? 'bg-secondary text-secondary-foreground border-secondary'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {getLanguageName(lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {subtitleLanguages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Subtitle language</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subtitleLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() =>
                            setSelectedSubtitleLang(
                              selectedSubtitleLang === lang ? null : lang
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            selectedSubtitleLang === lang
                              ? 'bg-secondary text-secondary-foreground border-secondary'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {getLanguageName(lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                {selectedSubType && <Badge variant="secondary">{ISSUE_SUB_TYPE_LABELS[selectedSubType]}</Badge>}
                {selectedPlatform && <Badge variant="secondary">{selectedPlatform}</Badge>}
                {selectedAudioLang && (
                  <Badge variant="secondary">Audio: {getLanguageName(selectedAudioLang)}</Badge>
                )}
                {selectedSubtitleLang && (
                  <Badge variant="secondary">Sub: {getLanguageName(selectedSubtitleLang)}</Badge>
                )}
              </div>
            )}

            </div>

            {/* Submit — always visible */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedType || selectedEpisodes.length === 0 || submitting}
              className="w-full shrink-0"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
