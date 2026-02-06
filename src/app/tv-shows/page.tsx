import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getPosterUrl } from "@/lib/tmdb";
import {
  computeEpisodeQuality,
  computeSeasonQuality,
  computeShowQuality,
  getDisplayMonitorStatus,
  getQualityStatusVariant,
  QUALITY_STATUS_LABELS,
} from "@/lib/status";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TVShowsToolbar } from "./toolbar";
import { TVShowDialog } from "./show-dialog";
import { ShowStatusBadges } from "./show-status-badges";
import { MonitorStatus } from "@/generated/prisma/client";
import { Star, Film, HardDrive } from "lucide-react";
import { formatFileSize } from "@/lib/format";

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string; monitor?: string; view?: string }>;
}

export default async function TVShowsPage({ searchParams }: Props) {
  const [{ q, monitor, view = 'grid' }, settings] = await Promise.all([
    searchParams,
    getSettings(),
  ]);

  const shows = await prisma.tVShow.findMany({
    where: {
      ...(q ? { title: { contains: q } } : {}),
      ...(monitor && monitor !== 'all' ? { monitorStatus: monitor as MonitorStatus } : {}),
    },
    include: {
      seasons: {
        include: {
          episodes: {
            include: {
              files: {
                select: { quality: true, fileSize: true },
              },
            },
          },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  // Compute quality status and file stats for each show
  const showsWithQuality = shows.map((show) => {
    let fileCount = 0;
    let totalSize = BigInt(0);

    const seasonsWithQuality = show.seasons.map((season) => {
      const episodesWithQuality = season.episodes.map((episode) => {
        // Count files and sum sizes
        fileCount += episode.files.length;
        for (const file of episode.files) {
          totalSize += file.fileSize;
        }
        return {
          ...episode,
          qualityStatus: computeEpisodeQuality(episode.monitorStatus, episode.files),
        };
      });
      return {
        ...season,
        episodes: episodesWithQuality,
        qualityStatus: computeSeasonQuality(episodesWithQuality),
      };
    });

    const displayMonitorStatus = getDisplayMonitorStatus(show.monitorStatus, show.seasons);
    const qualityStatus = computeShowQuality(seasonsWithQuality);

    return {
      ...show,
      seasons: seasonsWithQuality,
      displayMonitorStatus,
      qualityStatus,
      fileCount,
      totalSize,
    };
  });

  const isTableView = view === 'table';

  return (
    <div className="p-8">
      {/* Sticky Header + Toolbar */}
      <div className="sticky top-0 z-10 bg-background pb-4 -mx-8 px-8 pt-0 -mt-8 border-b">
        <div className="pt-8 mb-4">
          <h1 className="text-3xl font-bold">TV Shows ({shows.length})</h1>
          <p className="text-muted-foreground">
            Browse and manage your TV show library
          </p>
        </div>

        {/* Toolbar */}
        <Suspense fallback={null}>
          <TVShowsToolbar />
        </Suspense>
      </div>

      <div className="mt-6">
      {showsWithQuality.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-2">
              {q || monitor ? 'No TV shows match your filters.' : 'No TV shows in your library yet.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {q || monitor ? 'Try adjusting your search or filters.' : 'Run a filesystem scan or add shows manually.'}
            </p>
          </CardContent>
        </Card>
      ) : isTableView ? (
        /* Table View */
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
                {showsWithQuality.map((show) => (
                  <TableRow key={show.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{show.title}</span>
                        {show.tmdbId && (
                          <Badge variant="outline" className="text-xs">TMDB</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {show.year ?? '—'}
                    </TableCell>
                    <TableCell>
                      {show.voteAverage ? (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="size-3 fill-current" />
                          {show.voteAverage.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{show.seasons.length}</TableCell>
                    <TableCell>
                      {show.seasons.reduce(
                        (acc, season) => acc + season.episodes.length,
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {show.fileCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {show.fileCount > 0 ? formatFileSize(show.totalSize) : '—'}
                    </TableCell>
                    <TableCell>
                      <ShowStatusBadges
                        showId={show.id}
                        monitorStatus={show.monitorStatus}
                        displayMonitorStatus={show.displayMonitorStatus}
                        qualityStatus={show.qualityStatus}
                        hasChildren={show.seasons.length > 0}
                        showQuality={false}
                      />
                    </TableCell>
                    <TableCell>
                      {show.monitorStatus !== 'UNWANTED' ? (
                        <Badge variant={getQualityStatusVariant(show.qualityStatus)}>
                          {QUALITY_STATUS_LABELS[show.qualityStatus]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <TVShowDialog show={show} trigger="button" />
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tv-shows/${show.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid gap-4">
          {showsWithQuality.map((show) => (
            <div key={show.id} className="block">
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Poster */}
                    <Link href={`/tv-shows/${show.id}`} className="flex-shrink-0">
                      {show.posterPath ? (
                        <div className="w-20 h-30 rounded overflow-hidden bg-muted">
                          <img
                            src={getPosterUrl(show.posterPath, 'w154') || ''}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-30 rounded bg-muted flex items-center justify-center">
                          <Film className="size-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <Link href={`/tv-shows/${show.id}`} className="flex-1 min-w-0">
                          <h2 className="text-xl font-semibold hover:underline truncate">{show.title}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            {show.year && (
                              <span className="text-sm text-muted-foreground">{show.year}</span>
                            )}
                            {show.voteAverage && (
                              <span className="flex items-center gap-1 text-amber-500 text-sm">
                                <Star className="size-3 fill-current" />
                                {show.voteAverage.toFixed(1)}
                              </span>
                            )}
                            {show.tmdbId && (
                              <Badge variant="outline" className="text-xs">TMDB</Badge>
                            )}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ShowStatusBadges
                            showId={show.id}
                            monitorStatus={show.monitorStatus}
                            displayMonitorStatus={show.displayMonitorStatus}
                            qualityStatus={show.qualityStatus}
                            hasChildren={show.seasons.length > 0}
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
                          <span className="font-semibold">{show.seasons.length}</span>
                        </div>
                        <div className="bg-muted px-3 py-2 rounded">
                          <span className="text-muted-foreground">Episodes: </span>
                          <span className="font-semibold">
                            {show.seasons.reduce((acc, season) => acc + season.episodes.length, 0)}
                          </span>
                        </div>
                        <div className="bg-muted px-3 py-2 rounded flex items-center gap-1">
                          <HardDrive className="size-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Files: </span>
                          <span className="font-semibold">{show.fileCount}</span>
                          {show.fileCount > 0 && (
                            <span className="text-muted-foreground ml-1">
                              ({formatFileSize(show.totalSize)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
