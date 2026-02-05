import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getStatusVariant } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { formatDateWithFormat } from "@/lib/format";
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">TV Shows</h1>
        <p className="text-muted-foreground">
          Browse and manage your TV show library
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <Suspense fallback={null}>
          <TVShowsToolbar />
        </Suspense>
      </div>

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
                  <TableHead>Seasons</TableHead>
                  <TableHead>Episodes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shows.map((show) => (
                  <TableRow key={show.id}>
                    <TableCell className="font-medium">{show.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {show.year ?? '—'}
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
                  <div className="flex items-start justify-between mb-4">
                    <Link href={`/tv-shows/${show.id}`} className="flex-1">
                      <h2 className="text-xl font-semibold hover:underline">{show.title}</h2>
                      {show.year && (
                        <p className="text-sm text-muted-foreground">
                          {show.year}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(show.status)}>
                        {show.status}
                      </Badge>
                      <TVShowDialog show={show} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Seasons</p>
                      <p className="text-2xl font-bold">{show.seasons.length}</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Episodes</p>
                      <p className="text-2xl font-bold">
                        {show.seasons.reduce(
                          (acc, season) => acc + season.episodes.length,
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="text-xs truncate">
                        {formatDateWithFormat(show.updatedAt, dateFormat)}
                      </p>
                    </div>
                  </div>

                  {show.notes && (
                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                      {show.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
