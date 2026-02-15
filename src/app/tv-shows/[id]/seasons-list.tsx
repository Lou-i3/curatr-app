'use client';

/**
 * Expandable Seasons List
 * Displays seasons as collapsible cards that expand to show episodes
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getMonitorStatusVariant,
  getQualityStatusVariant,
  getDisplayMonitorStatus,
  MONITOR_STATUS_LABELS,
  MONITOR_STATUS_OPTIONS,
  QUALITY_STATUS_LABELS,
  type QualityStatus,
} from '@/lib/status';
import { getPosterUrl } from '@/lib/tmdb/images';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ChevronDown } from 'lucide-react';
import { SeasonDialog } from './season-dialog';
import { createEpisodeColumns, type Episode } from './episode-columns';
import { BadgeSelector } from '@/components/badge-selector';
import { useAuth } from '@/lib/contexts/auth-context';
import type { MonitorStatus } from '@/generated/prisma/client';

interface Season {
  id: number;
  seasonNumber: number;
  tmdbSeasonId: number | null;
  name: string | null;
  monitorStatus: MonitorStatus;
  qualityStatus: QualityStatus;
  notes: string | null;
  posterPath: string | null;
  description: string | null;
  airDate: Date | null;
  episodes: Episode[];
}

interface SeasonsListProps {
  showId: number;
  showTitle: string;
  showTmdbId?: number | null;
  seasons: Season[];
}

export function SeasonsList({ showId, showTitle, showTmdbId, seasons }: SeasonsListProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set());

  const toggleSeason = (seasonId: number) => {
    setOpenSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonId)) {
        next.delete(seasonId);
      } else {
        next.add(seasonId);
      }
      return next;
    });
  };

  if (seasons.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No seasons found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {seasons.map((season) => {
        const seasonDisplayMonitor = getDisplayMonitorStatus(season.monitorStatus, season.episodes);
        const isOpen = openSeasons.has(season.id);

        return (
          <Collapsible
            key={season.id}
            open={isOpen}
            onOpenChange={() => toggleSeason(season.id)}
          >
            <Card className="border rounded-lg bg-card p-0">
              <CardContent className="p-4">
                {/* Main row container */}
                <div className="flex flex-row gap-4 items-start">
                  {/* Left: Poster */}
                  <div className="w-10 h-14 flex-shrink-0">
                    {season.posterPath ? (
                      <img
                        src={getPosterUrl(season.posterPath, 'w92') || ''}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded" />
                    )}
                  </div>

                  {/* Middle: Season info column */}
                  <CollapsibleTrigger className="flex-1 text-left hover:bg-accent/50 rounded p-2 -m-2 transition-colors">
                    <div className="space-y-2">
                      {/* Row 1: Season name/number/TMDB (becomes column on mobile) */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                        <span className="text-base md:text-lg font-semibold">
                          {season.name || `Season ${season.seasonNumber}`}
                        </span>
                        {season.name && (
                          <span className="text-xs md:text-sm text-muted-foreground font-normal">
                            (Season {season.seasonNumber})
                          </span>
                        )}
                        {season.tmdbSeasonId && showTmdbId && (
                          <a
                            href={`https://www.themoviedb.org/tv/${showTmdbId}/season/${season.seasonNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground font-normal hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{season.tmdbSeasonId}
                          </a>
                        )}
                      </div>

                      {/* Row 2: Episode count + Badges (becomes column on mobile) */}
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                        <span className="text-xs md:text-sm text-muted-foreground">
                          {season.episodes.length} episodes
                        </span>
                        <BadgeSelector
                          value={season.monitorStatus}
                          displayLabel={MONITOR_STATUS_LABELS[seasonDisplayMonitor]}
                          variant={getMonitorStatusVariant(seasonDisplayMonitor)}
                          getVariant={getMonitorStatusVariant}
                          options={MONITOR_STATUS_OPTIONS}
                          onValueChange={() => {}} // Handled by cascade API call
                          cascadeOptions={{
                            entityType: 'season',
                            entityId: season.id,
                            hasChildren: season.episodes.length > 0,
                            apiEndpoint: '/api/seasons',
                            propertyKey: 'monitorStatus',
                            entityLabel: 'season',
                            childrenLabel: 'episodes',
                            getConfirmationText: (value: string) =>
                              value === 'WANTED' ? 'Change to Wanted' : 'Change to Unwanted',
                          }}
                          onUpdate={() => router.refresh()}
                        />
                        {season.monitorStatus !== 'UNWANTED' && (
                          <Badge variant={getQualityStatusVariant(season.qualityStatus)}>
                            {QUALITY_STATUS_LABELS[season.qualityStatus]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 md:flex-shrink-0">
                    {isAdmin && <SeasonDialog season={season} />}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardContent>

              {/* Episodes table */}
              <CollapsibleContent>
                <div className="border-t">
                  {season.episodes.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground">No episodes in this season.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <DataTable
                        columns={createEpisodeColumns(
                          showId,
                          showTitle,
                          showTmdbId ?? null,
                          season.seasonNumber,
                          () => router.refresh()
                        )}
                        data={season.episodes}
                      />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
