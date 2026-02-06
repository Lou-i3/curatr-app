'use client';

/**
 * Expandable Seasons List
 * Displays seasons as accordion items that expand to show episodes
 */

import Link from 'next/link';
import { getStatusVariant } from '@/lib/status';
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
import { ChevronRight } from 'lucide-react';
import { SeasonDialog } from './season-dialog';
import { EpisodeDialog } from './episode-dialog';

interface Episode {
  id: number;
  episodeNumber: number;
  tmdbEpisodeId: number | null;
  title: string | null;
  status: string;
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
  status: string;
  notes: string | null;
  posterPath: string | null;
  description: string | null;
  airDate: Date | null;
  episodes: Episode[];
}

interface SeasonsListProps {
  showId: number;
  seasons: Season[];
}

export function SeasonsList({ showId, seasons }: SeasonsListProps) {
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
      {seasons.map((season) => (
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
                    {season.tmdbSeasonId && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        #{season.tmdbSeasonId}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {season.episodes.length} episodes
                  </span>
                  <Badge variant={getStatusVariant(season.status)}>
                    {season.status}
                  </Badge>
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
                    <TableHead className="w-28">Status</TableHead>
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
                        {episode.tmdbEpisodeId ? `#${episode.tmdbEpisodeId}` : '—'}
                      </TableCell>
                      <TableCell>{episode.title || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(episode.status)} className="text-xs">
                          {episode.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {episode.files.length}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
      ))}
    </Accordion>
  );
}
