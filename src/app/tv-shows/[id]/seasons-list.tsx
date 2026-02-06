'use client';

/**
 * Expandable Seasons List
 * Displays seasons as accordion items that expand to show episodes
 */

import Link from 'next/link';
import { getStatusVariant } from '@/lib/status';
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

interface Episode {
  id: number;
  episodeNumber: number;
  title: string | null;
  status: string;
  files: { id: number }[];
}

interface Season {
  id: number;
  seasonNumber: number;
  status: string;
  notes: string | null;
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
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-accent/50 rounded-lg data-[state=open]:rounded-b-none">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">
                  Season {season.seasonNumber}
                </h3>
                {season.notes && (
                  <span className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                    {season.notes}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {season.episodes.length} episodes
                </span>
                <Badge variant={getStatusVariant(season.status)}>
                  {season.status}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
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
                    <TableHead>Title</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-20">Files</TableHead>
                    <TableHead className="w-20 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {season.episodes.map((episode) => (
                    <TableRow key={episode.id}>
                      <TableCell className="font-medium font-mono">
                        E{String(episode.episodeNumber).padStart(2, '0')}
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
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tv-shows/${showId}/episodes/${episode.id}`}>
                            <ChevronRight className="size-4" />
                          </Link>
                        </Button>
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
