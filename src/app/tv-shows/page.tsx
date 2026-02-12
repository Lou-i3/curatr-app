'use client';

/**
 * TV Shows page - Client component for fast navigation
 * Fetches data from API after page renders for instant feedback
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Table as TableInstance } from '@tanstack/react-table';
import { getPosterUrl } from '@/lib/tmdb/images';
import {
  getQualityStatusVariant,
  QUALITY_STATUS_LABELS,
} from '@/lib/status';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TVShowsToolbar } from './toolbar';
import { TVShowDialog } from './show-dialog';
import { ShowStatusBadges } from './show-status-badges';
import { TVShowsTable } from './tv-shows-table';
import type { TVShow } from './tv-show-columns';
import { Star, Film, HardDrive } from 'lucide-react';
import { formatFileSize } from '@/lib/settings-shared';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';

function ShowCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="w-24 h-36 sm:w-20 sm:h-30 flex-shrink-0 mx-auto sm:mx-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-2">
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-24 rounded" />
              <Skeleton className="h-9 w-28 rounded" />
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><div className="flex justify-end gap-1"><Skeleton className="h-8 w-16" /></div></TableCell>
    </TableRow>
  );
}

export default function TVShowsPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const monitor = searchParams.get('monitor') ?? 'all';
  const view = searchParams.get('view') ?? 'grid';

  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<TableInstance<TVShow> | null>(null);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('full', 'true');
      if (q) params.set('q', q);
      if (monitor && monitor !== 'all') params.set('monitor', monitor);

      const response = await fetch(`/api/tv-shows?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setShows(data.shows);
    } catch (error) {
      console.error('Failed to fetch TV shows:', error);
    } finally {
      setLoading(false);
    }
  }, [q, monitor]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const isTableView = view === 'table';

  return (
    <PageContainer maxWidth="wide">
      {/* Sticky header + toolbar wrapper */}
      <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <PageHeader
          title={`TV Shows ${!loading ? `(${shows.length})` : ''}`}
          description="Browse and manage your TV show library"
          breadcrumbs={[{ label: 'TV Shows' }]}
        />
        <TVShowsToolbar table={table} />
      </div>

      <div>
        {loading ? (
          /* Loading Skeleton */
          isTableView ? (
            <div className="overflow-x-auto">
              <Card>
                <CardContent className="p-0">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Seasons</TableHead>
                      <TableHead>Episodes</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Monitor</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShowCardSkeleton key={i} />
              ))}
            </div>
          )
        ) : shows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">
                {q || monitor !== 'all' ? 'No TV shows match your filters.' : 'No TV shows in your library yet.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {q || monitor !== 'all' ? 'Try adjusting your search or filters.' : 'Run a filesystem scan or add shows manually.'}
              </p>
            </CardContent>
          </Card>
        ) : isTableView ? (
          /* Table View - DataTable with sorting */
          <div className="overflow-x-auto">
            <TVShowsTable shows={shows} onTableReady={setTable} />
          </div>
        ) : (
          /* Grid View */
          <div className="space-y-4 md:space-y-6">
            {shows.map((show) => (
              <Card key={show.id} className="hover:bg-accent/50 transition-colors p-0">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Poster */}
                      <Link href={`/tv-shows/${show.id}`} className="flex-shrink-0 mx-auto sm:mx-0">
                        {show.posterPath ? (
                          <div className="w-24 h-36 sm:w-20 sm:h-30 rounded overflow-hidden bg-muted">
                            <img
                              src={getPosterUrl(show.posterPath, 'w154') || ''}
                              alt={show.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-36 sm:w-20 sm:h-30 rounded bg-muted flex items-center justify-center">
                            <Film className="size-8 text-muted-foreground" />
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-2">
                          <Link href={`/tv-shows/${show.id}`} className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold hover:underline truncate">{show.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              {show.year && (
                                <span className="text-sm text-muted-foreground">{show.year}</span>
                              )}
                              {show.voteAverage && (
                                <span className="flex items-center gap-1 text-warning-foreground text-sm">
                                  <Star className="size-3 fill-current" />
                                  {show.voteAverage.toFixed(1)}
                                </span>
                              )}
                              {show.tmdbId && (
                                <Badge variant="outline" className="text-xs">TMDB</Badge>
                              )}
                            </div>
                          </Link>
                          <div className="flex items-center gap-2 sm:flex-shrink-0">
                            <ShowStatusBadges
                              showId={show.id}
                              monitorStatus={show.monitorStatus}
                              displayMonitorStatus={show.displayMonitorStatus}
                              qualityStatus={show.qualityStatus}
                              hasChildren={show.seasonCount > 0}
                              showQuality={show.monitorStatus !== 'UNWANTED'}
                            />
                            <TVShowDialog show={show} />
                          </div>
                        </div>

                        {/* Description or Notes */}
                        {(show.description || show.notes) && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {show.description || show.notes}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="bg-muted px-3 py-2 rounded">
                            <span className="text-muted-foreground">Seasons: </span>
                            <span className="font-semibold">{show.seasonCount}</span>
                          </div>
                          <div className="bg-muted px-3 py-2 rounded">
                            <span className="text-muted-foreground">Episodes: </span>
                            <span className="font-semibold">{show.episodeCount}</span>
                          </div>
                          <div className="bg-muted px-3 py-2 rounded flex items-center gap-1">
                            <HardDrive className="size-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Files: </span>
                            <span className="font-semibold">{show.fileCount}</span>
                            {show.fileCount > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({formatFileSize(BigInt(show.totalSize))})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
