'use client';

/**
 * Expandable Seasons List
 * Displays seasons as accordion items that expand to show episodes
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, PlayCircle, AlertTriangle } from 'lucide-react';
import { SeasonDialog } from './season-dialog';
import { EpisodeDialog } from './episode-dialog';
import { PlaybackTestDialog } from '@/components/playback-test-dialog';
import { IssueReportDialog } from '@/components/issues/issue-report-dialog';
import { BadgeSelector } from '@/components/badge-selector';
import type { MonitorStatus } from '@/generated/prisma/client';

interface Episode {
  id: number;
  episodeNumber: number;
  tmdbEpisodeId: number | null;
  title: string | null;
  monitorStatus: MonitorStatus;
  qualityStatus: QualityStatus;
  notes: string | null;
  description: string | null;
  airDate: Date | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number | null;
  files: { id: number }[];
}

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
    <Accordion type="multiple" className="space-y-4">
      {seasons.map((season) => {
        const seasonDisplayMonitor = getDisplayMonitorStatus(season.monitorStatus, season.episodes);

        return (
          <AccordionItem
            key={season.id}
            value={`season-${season.id}`}
            className="border rounded-lg bg-card"
          >
            <div className="flex items-center">
              <AccordionTrigger className="flex-1 px-4 py-3 items-center hover:no-underline hover:bg-accent/50 rounded-lg data-[state=open]:rounded-b-none [&[data-state=open]>svg]:rotate-180">
                <span className="flex items-center justify-between w-full pr-2">
                  <span className="flex items-center gap-3">
                    {season.posterPath ? (
                      <img
                        src={getPosterUrl(season.posterPath, 'w92') || ''}
                        alt=""
                        className="w-10 h-14 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex-shrink-0" />
                    )}
                    <span className="text-lg font-semibold">
                      {season.name || `Season ${season.seasonNumber}`}
                      {season.name && (
                        <span className="text-muted-foreground font-normal ml-2">
                          (Season {season.seasonNumber})
                        </span>
                      )}
                      {season.tmdbSeasonId && showTmdbId && (
                        <a
                          href={`https://www.themoviedb.org/tv/${showTmdbId}/season/${season.seasonNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground font-normal ml-2 hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{season.tmdbSeasonId}
                        </a>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
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
                  </span>
                </span>
              </AccordionTrigger>
              <div className="pr-4">
                <SeasonDialog season={season} />
              </div>
            </div>
            <AccordionContent className="px-0 pb-0">
              {season.episodes.length === 0 ? (
                <div className="p-6 text-center border-t">
                  <p className="text-muted-foreground">No episodes in this season.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-t">
                      <TableHead className="w-20">Episode</TableHead>
                      <TableHead className="w-24">TMDB</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-28">Monitor</TableHead>
                      <TableHead className="w-28">Quality</TableHead>
                      <TableHead className="w-20">Files</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {season.episodes.map((episode) => (
                      <TableRow key={episode.id}>
                        <TableCell className="font-medium font-mono">
                          E{String(episode.episodeNumber).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {episode.tmdbEpisodeId && showTmdbId ? (
                            <a
                              href={`https://www.themoviedb.org/tv/${showTmdbId}/season/${season.seasonNumber}/episode/${episode.episodeNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary hover:underline"
                            >
                              #{episode.tmdbEpisodeId}
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{episode.title || '—'}</TableCell>
                        <TableCell>
                          <BadgeSelector
                            value={episode.monitorStatus}
                            displayLabel={MONITOR_STATUS_LABELS[episode.monitorStatus]}
                            variant={getMonitorStatusVariant(episode.monitorStatus)}
                            getVariant={getMonitorStatusVariant}
                            options={MONITOR_STATUS_OPTIONS}
                            onValueChange={() => {}} // Handled by cascade API call
                            cascadeOptions={{
                              entityType: 'episode',
                              entityId: episode.id,
                              hasChildren: false,
                              apiEndpoint: '/api/episodes',
                              propertyKey: 'monitorStatus',
                              entityLabel: 'episode',
                              childrenLabel: '',
                              getConfirmationText: (value: string) =>
                                value === 'WANTED' ? 'Change to Wanted' : 'Change to Unwanted',
                            }}
                            onUpdate={() => router.refresh()}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          {episode.monitorStatus !== 'UNWANTED' ? (
                            <Badge variant={getQualityStatusVariant(episode.qualityStatus)} className="text-xs">
                              {QUALITY_STATUS_LABELS[episode.qualityStatus]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {episode.files.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IssueReportDialog
                              episodeId={episode.id}
                              episodeLabel={`${showTitle} — S${String(season.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Report issue">
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                              }
                            />
                            {episode.files.length > 0 && (
                              <PlaybackTestDialog
                                episodeId={episode.id}
                                episodeTitle={episode.title}
                                seasonEpisode={`S${String(season.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                            <EpisodeDialog
                              episode={episode}
                              seasonNumber={season.seasonNumber}
                            />
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/tv-shows/${showId}/episodes/${episode.id}`}>
                                <ChevronRight className="size-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
