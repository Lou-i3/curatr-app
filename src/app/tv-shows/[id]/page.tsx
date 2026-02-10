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
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
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
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
          {/* Poster */}
          {show.posterPath ? (
            <div className="w-32 h-48 sm:w-24 sm:h-36 md:w-32 md:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-muted mx-auto sm:mx-0">
              <img
                src={getPosterUrl(show.posterPath, 'w185') || ''}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
            {/* GROUP 1: PRIMARY INFO */}
            <div className="space-y-3">
              {/* Title + Badges + Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold">{show.title}</h1>
                  <ShowDetailStatusBadges
                    showId={show.id}
                    monitorStatus={show.monitorStatus}
                    displayMonitorStatus={displayMonitorStatus}
                    qualityStatus={qualityStatus}
                    hasChildren={show.seasons.length > 0}
                  />
                </div>
                <ButtonGroup className="flex-shrink-0">
                  <ShowScanButton show={{
                    id: show.id,
                    title: show.title,
                    folderName: show.folderName,
                  }} />
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
                </ButtonGroup>
              </div>

              {/* Season + Episode Counts */}
              <div className="flex flex-row items-center gap-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Tv className="size-3" />
                  <span><strong className="text-foreground">{show.seasons.length}</strong> seasons</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Film className="size-3" />
                  <span><strong className="text-foreground">{totalEpisodes}</strong> episodes</span>
                </div>
              </div>
            </div>

            {/* Separator 1 */}
            {(show.year || show.voteAverage || show.networkStatus || show.description || show.notes) && (
              <Separator className="opacity-60" />
            )}

            {/* GROUP 2: CONTENT */}
            {(show.year || show.voteAverage || show.networkStatus || show.genres || show.description || show.notes) && (
              <div className="space-y-3">
                {/* Metadata + Genres */}
                {(show.year || show.voteAverage || show.networkStatus || show.genres) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {show.year && (
                      <span className="text-sm text-muted-foreground">{show.year}</span>
                    )}
                    
                    {show.genres && (
                      <>
                        {JSON.parse(show.genres).map((genre: string) => (
                          <Badge key={genre} variant="secondary" className="text-xs">{genre}</Badge>
                        ))}
                      </>
                    )}

                    {show.voteAverage && (
                      <span className="flex items-center gap-1 text-warning-foreground text-sm">
                        <Star className="size-4 fill-current" />
                        {show.voteAverage.toFixed(1)}
                      </span>
                    )}

                    {show.networkStatus && (
                      <Badge variant="outline" className="text-xs">{show.networkStatus}</Badge>
                    )}
                  </div>
                )}

                {/* Description */}
                {show.description && (
                  <p className="text-muted-foreground max-w-2xl leading-relaxed">{show.description}</p>
                )}


                {/* Notes */}
                {show.notes && (
                  <>
                    <Separator className="opacity-40" />
                    <div className="rounded-md bg-muted/50 px-3 py-2.5 border border-border/50">
                      <p className="text-sm italic text-muted-foreground leading-relaxed">{show.notes}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Separator 2 */}
            <Separator className="opacity-60" />

            {/* GROUP 3: STATS */}
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Calendar className="size-4" />
              <span>Updated {formatDateWithFormat(show.updatedAt, dateFormat)}</span>
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
