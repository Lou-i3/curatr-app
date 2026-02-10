import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDateWithFormat } from "@/lib/format";
import { getPosterUrl } from "@/lib/tmdb";
import {
  computeEpisodeQuality,
  computeSeasonQuality,
  computeShowQuality,
  getDisplayMonitorStatus,
} from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star, Calendar, Tv, Film } from "lucide-react";
import { TmdbSection } from "./tmdb-section";
import { ShowEditButton } from "./show-edit-button";
import { ShowScanButton } from "./show-scan-button";
import { ShowDetailStatusBadges } from "./show-detail-status-badges";
import { SeasonsList } from "./seasons-list";
import { PageContainer } from "@/components/layout";

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
            include: {
              files: {
                select: { id: true, quality: true },
              },
            },
          },
        },
      },
    },
  });

  if (!show) {
    notFound();
  }

  // Compute quality statuses
  const seasonsWithQuality = show.seasons.map((season) => {
    const episodesWithQuality = season.episodes.map((episode) => ({
      ...episode,
      qualityStatus: computeEpisodeQuality(episode.monitorStatus, episode.files),
    }));
    return {
      ...season,
      episodes: episodesWithQuality,
      qualityStatus: computeSeasonQuality(episodesWithQuality),
    };
  });

  const displayMonitorStatus = getDisplayMonitorStatus(show.monitorStatus, show.seasons);
  const qualityStatus = computeShowQuality(seasonsWithQuality);

  const totalEpisodes = show.seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0
  );

  // Calculate TMDB sync stats
  const syncStats = {
    totalSeasons: show.seasons.length,
    syncedSeasons: show.seasons.filter((s) => s.tmdbSeasonId !== null).length,
    totalEpisodes,
    syncedEpisodes: show.seasons.reduce(
      (acc, season) => acc + season.episodes.filter((e) => e.tmdbEpisodeId !== null).length,
      0
    ),
  };

  return (
    <PageContainer maxWidth="wide">
      {/* Breadcrumb */}
      <div className="mb-4 md:mb-6 flex items-center gap-2 text-sm overflow-auto">
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
      <div className="mb-6 md:mb-8">
        <div className="flex gap-4 md:gap-6">
          {/* Poster */}
          {show.posterPath ? (
            <div className="w-24 h-36 md:w-32 md:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={getPosterUrl(show.posterPath, 'w185') || ''}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold">{show.title}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {show.year && (
                    <span className="text-base md:text-lg text-muted-foreground">{show.year}</span>
                  )}
                  {show.voteAverage && (
                    <span className="flex items-center gap-1 text-warning-foreground">
                      <Star className="size-4 fill-current" />
                      {show.voteAverage.toFixed(1)}
                    </span>
                  )}
                  {show.networkStatus && (
                    <Badge variant="outline">{show.networkStatus}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ShowScanButton show={{
                  id: show.id,
                  title: show.title,
                  folderName: show.folderName,
                }} />
                <ShowDetailStatusBadges
                  showId={show.id}
                  monitorStatus={show.monitorStatus}
                  displayMonitorStatus={displayMonitorStatus}
                  qualityStatus={qualityStatus}
                  hasChildren={show.seasons.length > 0}
                />
                <ShowEditButton show={{
                  id: show.id,
                  title: show.title,
                  folderName: show.folderName,
                  year: show.year,
                  monitorStatus: show.monitorStatus,
                  notes: show.notes,
                  description: show.description,
                  posterPath: show.posterPath,
                  backdropPath: show.backdropPath,
                }} />
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
            {show.description && (
              <p className="text-muted-foreground max-w-2xl">{show.description}</p>
            )}

            {/* Personal Notes */}
            {show.notes && (
              <div className="mt-3 max-w-2xl rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm italic text-muted-foreground">{show.notes}</p>
              </div>
            )}

            {/* Mini Stats */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tv className="size-4" />
                <span><strong className="text-foreground">{show.seasons.length}</strong> seasons</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Film className="size-4" />
                <span><strong className="text-foreground">{totalEpisodes}</strong> episodes</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-4" />
                <span>Updated {formatDateWithFormat(show.updatedAt, dateFormat)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TMDB Integration */}
      <div className="mb-6 md:mb-8">
        <TmdbSection
          showId={show.id}
          showTitle={show.title}
          showYear={show.year}
          tmdbId={show.tmdbId}
          lastMetadataSync={show.lastMetadataSync}
          dateFormat={dateFormat}
          syncStats={syncStats}
        />
      </div>

      {/* Seasons */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Seasons</h2>
        <SeasonsList showId={show.id} showTitle={show.title} showTmdbId={show.tmdbId} seasons={seasonsWithQuality} />
      </div>
    </PageContainer>
  );
}
