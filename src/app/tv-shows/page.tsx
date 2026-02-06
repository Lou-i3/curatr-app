import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getStatusVariant } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { formatDateWithFormat } from "@/lib/format";
import { getPosterUrl } from "@/lib/tmdb";
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
import { Status } from "@/generated/prisma/client";
import { Star, Film } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string; status?: string; view?: string }>;
}

export default async function TVShowsPage({ searchParams }: Props) {
  const [{ q, status, view = 'grid' }, settings] = await Promise.all([
    searchParams,
    getSettings(),
  ]);
  const dateFormat = settings.dateFormat;

  const shows = await prisma.tVShow.findMany({
    where: {
      ...(q ? { title: { contains: q } } : {}),
      ...(status && status !== 'all' ? { status: status as Status } : {}),
    },
    include: {
      seasons: {
        include: {
          episodes: true,
        },
      },
    },
    orderBy: { title: 'asc' },
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
      {shows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-2">
              {q || status ? 'No TV shows match your filters.' : 'No TV shows in your library yet.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {q || status ? 'Try adjusting your search or filters.' : 'Run a filesystem scan or add shows manually.'}
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shows.map((show) => (
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
                    <TableCell>
                      <Badge variant={getStatusVariant(show.status)}>
                        {show.status}
                      </Badge>
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
          {shows.map((show) => (
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
                          <Badge variant={getStatusVariant(show.status)}>
                            {show.status}
                          </Badge>
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
                      <div className="flex gap-4 text-sm">
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
