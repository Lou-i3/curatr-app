import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStatusVariant } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { formatDateWithFormat } from "@/lib/format";
import { getPosterUrl } from "@/lib/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star } from "lucide-react";
import { TmdbActions } from "./tmdb-actions";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShowDetailPage({ params }: Props) {
  const [{ id }, settings] = await Promise.all([params, getSettings()]);
  const dateFormat = settings.dateFormat;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    notFound();
  }

  const show = await prisma.tVShow.findUnique({
    where: { id: showId },
    include: {
      seasons: {
        orderBy: { seasonNumber: "asc" },
        include: {
          episodes: {
            orderBy: { episodeNumber: "asc" },
          },
        },
      },
    },
  });

  if (!show) {
    notFound();
  }

  const totalEpisodes = show.seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0
  );

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/tv-shows"
          className="text-primary hover:underline"
        >
          TV Shows
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{show.title}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-6">
          {/* Poster */}
          {show.posterPath ? (
            <div className="w-32 h-48 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={getPosterUrl(show.posterPath, 'w185') || ''}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold">{show.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {show.year && (
                    <span className="text-lg text-muted-foreground">{show.year}</span>
                  )}
                  {show.voteAverage && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="size-4 fill-current" />
                      {show.voteAverage.toFixed(1)}
                    </span>
                  )}
                  {show.networkStatus && (
                    <Badge variant="outline">{show.networkStatus}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TmdbActions
                  showId={show.id}
                  showTitle={show.title}
                  showYear={show.year}
                  tmdbId={show.tmdbId}
                />
                <Badge variant={getStatusVariant(show.status)} className="text-sm">
                  {show.status}
                </Badge>
              </div>
            </div>

            {/* Genres */}
            {show.genres && (
              <div className="flex gap-2 mb-3">
                {JSON.parse(show.genres).map((genre: string) => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {show.description ? (
              <p className="text-muted-foreground max-w-2xl">{show.description}</p>
            ) : show.notes ? (
              <p className="text-muted-foreground max-w-2xl">{show.notes}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm mb-2">Seasons</p>
            <p className="text-3xl font-bold">{show.seasons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm mb-2">Episodes</p>
            <p className="text-3xl font-bold">{totalEpisodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm mb-2">Last Updated</p>
            <p className="text-lg font-semibold">
              {formatDateWithFormat(show.updatedAt, dateFormat)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seasons */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Seasons</h2>
        {show.seasons.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No seasons found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {show.seasons.map((season) => (
              <Link
                key={season.id}
                href={`/tv-shows/${show.id}/seasons/${season.id}`}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          Season {season.seasonNumber}
                        </h3>
                        {season.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {season.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Episodes</p>
                          <p className="text-2xl font-bold">{season.episodes.length}</p>
                        </div>
                        <Badge variant={getStatusVariant(season.status)}>
                          {season.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
