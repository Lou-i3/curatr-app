'use client';

/**
 * TMDB Import Dialog
 * Allows importing seasons and episodes from TMDB with selection and status options
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Download,
  Check,
  ChevronDown,
  ChevronRight,
  FileVideo,
  Circle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ImportPreviewResponse,
  ImportPreviewSeason,
  ImportPreviewEpisode,
  ImportSeasonItem,
  ImportEpisodeItem,
  EpisodeGroupOption,
} from '@/lib/tmdb/types';

type SortOption = 'number' | 'airDate' | 'name';
type MonitorStatusOption = 'WANTED' | 'UNWANTED';

interface TmdbImportDialogProps {
  showId: number;
  showTitle: string;
  tmdbId: number;
  trigger?: React.ReactNode;
  onImport?: () => void;
}

interface EpisodeSelection {
  selected: boolean;
  monitorStatus: MonitorStatusOption;
}

interface SeasonSelection {
  expanded: boolean;
  episodes: Map<number, EpisodeSelection>;
}

export function TmdbImportDialog({
  showId,
  showTitle,
  tmdbId,
  trigger,
  onImport,
}: TmdbImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ImportPreviewResponse | null>(null);

  // Episode groups (alternative orderings)
  const [episodeGroups, setEpisodeGroups] = useState<EpisodeGroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('default'); // 'default' = default TMDB order

  // Selection state
  const [selections, setSelections] = useState<Map<number, SeasonSelection>>(new Map());

  // UI options
  const [sortBy, setSortBy] = useState<SortOption>('number');
  const [defaultMonitorStatus, setDefaultMonitorStatus] = useState<MonitorStatusOption>('WANTED');

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setData(null);
      setEpisodeGroups([]);
      setSelectedGroup('default');
      setSelections(new Map());
      setError(null);
    }
  }, [open]);

  // Load preview data when dialog opens or episode group changes
  useEffect(() => {
    if (!open) return;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = selectedGroup && selectedGroup !== 'default'
          ? `/api/tmdb/import-preview/${showId}?episodeGroup=${selectedGroup}`
          : `/api/tmdb/import-preview/${showId}`;
        const response = await fetch(url);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to load preview');
        }

        const previewData: ImportPreviewResponse = await response.json();
        setData(previewData);

        // Store episode groups (only on first load, they don't change with group selection)
        if (episodeGroups.length === 0 && previewData.episodeGroups.length > 0) {
          setEpisodeGroups(previewData.episodeGroups);
        }

        // Initialize selections - select episodes that don't exist or don't have files
        const newSelections = new Map<number, SeasonSelection>();
        for (const season of previewData.seasons) {
          const episodeSelections = new Map<number, EpisodeSelection>();
          for (const episode of season.episodes) {
            // Pre-select episodes that don't exist or exist without files
            const shouldSelect = !episode.existingEpisodeId || !episode.hasFiles;
            episodeSelections.set(episode.episodeNumber, {
              selected: shouldSelect,
              monitorStatus: defaultMonitorStatus,
            });
          }
          newSelections.set(season.seasonNumber, {
            expanded: false,
            episodes: episodeSelections,
          });
        }
        setSelections(newSelections);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [open, showId, defaultMonitorStatus, selectedGroup, episodeGroups.length]);

  // Sort seasons and episodes
  const sortedSeasons = useMemo(() => {
    if (!data) return [];

    const sorted = [...data.seasons];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'airDate':
          if (!a.airDate) return 1;
          if (!b.airDate) return -1;
          return new Date(a.airDate).getTime() - new Date(b.airDate).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.seasonNumber - b.seasonNumber;
      }
    });

    return sorted.map((season) => ({
      ...season,
      episodes: [...season.episodes].sort((a, b) => {
        switch (sortBy) {
          case 'airDate':
            if (!a.airDate) return 1;
            if (!b.airDate) return -1;
            return new Date(a.airDate).getTime() - new Date(b.airDate).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return a.episodeNumber - b.episodeNumber;
        }
      }),
    }));
  }, [data, sortBy]);

  // Count selected items
  const { selectedSeasons, selectedEpisodes } = useMemo(() => {
    let seasons = 0;
    let episodes = 0;

    for (const [, seasonSel] of selections) {
      const selectedEps = Array.from(seasonSel.episodes.values()).filter(
        (e) => e.selected
      );
      if (selectedEps.length > 0) {
        seasons++;
        episodes += selectedEps.length;
      }
    }

    return { selectedSeasons: seasons, selectedEpisodes: episodes };
  }, [selections]);

  // Toggle season expansion
  const toggleSeasonExpanded = (seasonNumber: number) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const season = newSelections.get(seasonNumber);
      if (season) {
        newSelections.set(seasonNumber, { ...season, expanded: !season.expanded });
      }
      return newSelections;
    });
  };

  // Toggle all episodes in a season
  const toggleSeasonSelection = (seasonNumber: number, selected: boolean) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const season = newSelections.get(seasonNumber);
      if (season) {
        const newEpisodes = new Map(season.episodes);
        for (const [epNum, epSel] of newEpisodes) {
          newEpisodes.set(epNum, { ...epSel, selected });
        }
        newSelections.set(seasonNumber, { ...season, episodes: newEpisodes });
      }
      return newSelections;
    });
  };

  // Toggle single episode
  const toggleEpisodeSelection = (seasonNumber: number, episodeNumber: number) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const season = newSelections.get(seasonNumber);
      if (season) {
        const episode = season.episodes.get(episodeNumber);
        if (episode) {
          const newEpisodes = new Map(season.episodes);
          newEpisodes.set(episodeNumber, { ...episode, selected: !episode.selected });
          newSelections.set(seasonNumber, { ...season, episodes: newEpisodes });
        }
      }
      return newSelections;
    });
  };

  // Set episode monitor status
  const setEpisodeMonitorStatus = (
    seasonNumber: number,
    episodeNumber: number,
    monitorStatus: MonitorStatusOption
  ) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const season = newSelections.get(seasonNumber);
      if (season) {
        const episode = season.episodes.get(episodeNumber);
        if (episode) {
          const newEpisodes = new Map(season.episodes);
          newEpisodes.set(episodeNumber, { ...episode, monitorStatus });
          newSelections.set(seasonNumber, { ...season, episodes: newEpisodes });
        }
      }
      return newSelections;
    });
  };

  // Select/deselect all
  const selectAll = (selected: boolean) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      for (const [seasonNum, season] of newSelections) {
        const newEpisodes = new Map(season.episodes);
        for (const [epNum, epSel] of newEpisodes) {
          newEpisodes.set(epNum, { ...epSel, selected });
        }
        newSelections.set(seasonNum, { ...season, episodes: newEpisodes });
      }
      return newSelections;
    });
  };

  // Apply default monitor status to all selected
  const applyDefaultMonitorStatus = () => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      for (const [seasonNum, season] of newSelections) {
        const newEpisodes = new Map(season.episodes);
        for (const [epNum, epSel] of newEpisodes) {
          if (epSel.selected) {
            newEpisodes.set(epNum, { ...epSel, monitorStatus: defaultMonitorStatus });
          }
        }
        newSelections.set(seasonNum, { ...season, episodes: newEpisodes });
      }
      return newSelections;
    });
  };

  // Get season selection state
  const getSeasonSelectionState = (
    seasonNumber: number
  ): 'none' | 'some' | 'all' => {
    const season = selections.get(seasonNumber);
    if (!season) return 'none';

    const episodes = Array.from(season.episodes.values());
    const selected = episodes.filter((e) => e.selected).length;

    if (selected === 0) return 'none';
    if (selected === episodes.length) return 'all';
    return 'some';
  };

  // Handle import
  const handleImport = async () => {
    if (!data) return;

    setImporting(true);
    setError(null);

    try {
      // Build import request
      const items: ImportSeasonItem[] = [];

      for (const season of data.seasons) {
        const seasonSel = selections.get(season.seasonNumber);
        if (!seasonSel) continue;

        const selectedEpisodes: ImportEpisodeItem[] = [];
        for (const episode of season.episodes) {
          const epSel = seasonSel.episodes.get(episode.episodeNumber);
          if (epSel?.selected) {
            selectedEpisodes.push({
              episodeNumber: episode.episodeNumber,
              title: episode.name,
              tmdbEpisodeId: episode.tmdbEpisodeId,
              airDate: episode.airDate,
              stillPath: episode.stillPath,
              description: episode.overview || null,
              runtime: episode.runtime,
              voteAverage: episode.voteAverage,
              monitorStatus: epSel.monitorStatus,
            });
          }
        }

        if (selectedEpisodes.length > 0) {
          items.push({
            seasonNumber: season.seasonNumber,
            name: season.name,
            tmdbSeasonId: season.tmdbSeasonId,
            airDate: season.airDate,
            posterPath: season.posterPath,
            description: season.overview || null,
            episodes: selectedEpisodes,
          });
        }
      }

      const response = await fetch('/api/tmdb/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, items }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to import');
      }

      const result = await response.json();

      // Task started in background - close dialog, visible in sidebar
      setOpen(false);
      setImporting(false);
      if (result.taskId) {
        // Refresh after a delay to show imported data
        setTimeout(() => {
          onImport?.();
          router.refresh();
        }, 1500);
      } else {
        onImport?.();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
      setImporting(false);
    }
  };

  // Get indicator for episode
  const getEpisodeIndicator = (episode: ImportPreviewEpisode) => {
    if (episode.existingEpisodeId && episode.hasFiles) {
      return (
        <span title="Exists with files">
          <CheckCircle2 className="size-4 text-green-500" />
        </span>
      );
    }
    if (episode.existingEpisodeId) {
      return (
        <span title="Exists without files">
          <Circle className="size-4 text-yellow-500 fill-yellow-500/20" />
        </span>
      );
    }
    return (
      <span title="Will be created">
        <Circle className="size-4 text-muted-foreground" />
      </span>
    );
  };

  // Get indicator for season
  const getSeasonIndicator = (season: ImportPreviewSeason) => {
    const allExist = season.episodes.every((e) => e.existingEpisodeId);
    const allHaveFiles = season.episodes.every(
      (e) => e.existingEpisodeId && e.hasFiles
    );
    const someExist = season.episodes.some((e) => e.existingEpisodeId);

    if (allHaveFiles) {
      return <Badge variant="outline" className="text-xs">All in DB</Badge>;
    }
    if (allExist) {
      return <Badge variant="secondary" className="text-xs">No files</Badge>;
    }
    if (someExist) {
      return <Badge variant="secondary" className="text-xs">Partial</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Not in DB</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-1" />
            Import from TMDB
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from TMDB</DialogTitle>
          <DialogDescription>
            Select seasons and episodes to import for &quot;{showTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-md">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && data && (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAll(false)}
                  >
                    Deselect All
                  </Button>
                </div>

                {/* Episode Group Selector */}
                {episodeGroups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Order:</span>
                    <Select
                      value={selectedGroup}
                      onValueChange={setSelectedGroup}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (TMDB)</SelectItem>
                        {episodeGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.typeLabel}: {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => setSortBy(v as SortOption)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="airDate">Air Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Default:</span>
                  <Select
                    value={defaultMonitorStatus}
                    onValueChange={(v) => setDefaultMonitorStatus(v as MonitorStatusOption)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WANTED">Wanted</SelectItem>
                      <SelectItem value="UNWANTED">Unwanted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={applyDefaultMonitorStatus}
                    title="Apply to selected"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Seasons list */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {sortedSeasons.map((season) => {
                  const seasonSel = selections.get(season.seasonNumber);
                  const isExpanded = seasonSel?.expanded ?? false;
                  const selectionState = getSeasonSelectionState(season.seasonNumber);

                  return (
                    <div
                      key={season.seasonNumber}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Season header */}
                      <div
                        className={cn(
                          'flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted',
                          isExpanded && 'border-b'
                        )}
                        onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSeasonExpanded(season.seasonNumber);
                          }}
                          className="text-muted-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>

                        <Checkbox
                          checked={selectionState === 'all'}
                          ref={(el) => {
                            if (el) {
                              (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate =
                                selectionState === 'some';
                            }
                          }}
                          onCheckedChange={(checked) => {
                            toggleSeasonSelection(season.seasonNumber, !!checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="flex-1 min-w-0">
                          <span className="font-medium">
                            {season.name}
                          </span>
                          <span className="text-muted-foreground ml-2 text-sm">
                            ({season.episodeCount} episodes)
                          </span>
                        </div>

                        {getSeasonIndicator(season)}
                      </div>

                      {/* Episodes */}
                      {isExpanded && (
                        <div className="divide-y">
                          {season.episodes.map((episode) => {
                            const epSel = seasonSel?.episodes.get(
                              episode.episodeNumber
                            );

                            return (
                              <div
                                key={episode.episodeNumber}
                                className="flex items-center gap-3 px-3 py-2 pl-10 hover:bg-muted/30"
                              >
                                <Checkbox
                                  checked={epSel?.selected ?? false}
                                  onCheckedChange={() =>
                                    toggleEpisodeSelection(
                                      season.seasonNumber,
                                      episode.episodeNumber
                                    )
                                  }
                                />

                                <span className="font-mono text-sm w-10">
                                  E{String(episode.episodeNumber).padStart(2, '0')}
                                </span>

                                <span className="flex-1 min-w-0 truncate text-sm">
                                  {episode.name}
                                </span>

                                {episode.airDate && (
                                  <span className="text-xs text-muted-foreground">
                                    {episode.airDate}
                                  </span>
                                )}

                                {epSel?.selected && (
                                  <Select
                                    value={epSel.monitorStatus}
                                    onValueChange={(v) =>
                                      setEpisodeMonitorStatus(
                                        season.seasonNumber,
                                        episode.episodeNumber,
                                        v as MonitorStatusOption
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="WANTED">Wanted</SelectItem>
                                      <SelectItem value="UNWANTED">Unwanted</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}

                                {getEpisodeIndicator(episode)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedSeasons} season{selectedSeasons !== 1 && 's'},{' '}
            {selectedEpisodes} episode{selectedEpisodes !== 1 && 's'} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedEpisodes === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-1" />
                  Import Selected
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
