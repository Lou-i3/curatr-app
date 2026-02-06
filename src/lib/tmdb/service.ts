/**
 * TMDB service layer
 * High-level operations for matching shows and syncing metadata
 */

import { prisma } from '@/lib/prisma';
import {
  searchTVShows,
  getTVShowDetails,
  getSeasonDetails as fetchSeasonDetails,
} from './client';
import type {
  TMDBSearchResult,
  TMDBShowDetails,
  TMDBSeasonDetails,
  TMDBMatchResult,
} from './types';

/** Minimum confidence score for auto-matching (0-100) */
const AUTO_MATCH_THRESHOLD = 80;

/**
 * Calculate match confidence between a local show and a TMDB result
 */
function calculateMatchConfidence(
  local: { title: string; year?: number | null },
  result: TMDBSearchResult,
  isFirstResult: boolean
): TMDBMatchResult {
  let confidence = 0;
  const matchReasons: string[] = [];

  const localTitle = local.title.toLowerCase().trim();
  const tmdbTitle = result.name.toLowerCase().trim();
  const tmdbOriginalTitle = result.original_name.toLowerCase().trim();

  // Exact title match: +50
  if (localTitle === tmdbTitle || localTitle === tmdbOriginalTitle) {
    confidence += 50;
    matchReasons.push('Exact title match');
  } else if (tmdbTitle.includes(localTitle) || localTitle.includes(tmdbTitle)) {
    // Partial match: +25
    confidence += 25;
    matchReasons.push('Partial title match');
  }

  // Year match: +30
  if (local.year && result.first_air_date) {
    const tmdbYear = parseInt(result.first_air_date.substring(0, 4), 10);
    if (local.year === tmdbYear) {
      confidence += 30;
      matchReasons.push('Year matches');
    } else if (Math.abs(local.year - tmdbYear) === 1) {
      // Off by one year: +15 (sometimes release dates differ by region)
      confidence += 15;
      matchReasons.push('Year within 1 year');
    }
  }

  // First result bonus: +10 (TMDB ranks by relevance)
  if (isFirstResult) {
    confidence += 10;
    matchReasons.push('Top search result');
  }

  // High popularity bonus: +10
  if (result.popularity > 50) {
    confidence += 10;
    matchReasons.push('Popular show');
  }

  return {
    tmdbShow: result,
    confidence: Math.min(confidence, 100),
    matchReasons,
  };
}

/**
 * Search TMDB for TV shows and return ranked matches
 * @param query - Search query (show title)
 * @param year - Optional year filter
 */
export async function searchShows(
  query: string,
  year?: number
): Promise<TMDBMatchResult[]> {
  const response = await searchTVShows(query, year);

  return response.results.map((result, index) =>
    calculateMatchConfidence({ title: query, year }, result, index === 0)
  );
}

/**
 * Auto-match a show if confidence is high enough
 * @param title - Show title
 * @param year - Optional year
 * @returns Best match if confidence >= threshold, null otherwise
 */
export async function autoMatchShow(
  title: string,
  year?: number
): Promise<TMDBMatchResult | null> {
  const matches = await searchShows(title, year);

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches[0];
  if (bestMatch.confidence >= AUTO_MATCH_THRESHOLD) {
    return bestMatch;
  }

  return null;
}

/**
 * Get full show details from TMDB
 */
export async function getShowDetails(tmdbId: number): Promise<TMDBShowDetails> {
  return getTVShowDetails(tmdbId);
}

/**
 * Get season details including all episodes from TMDB
 */
export async function getSeasonDetails(
  tmdbId: number,
  seasonNumber: number
): Promise<TMDBSeasonDetails> {
  return fetchSeasonDetails(tmdbId, seasonNumber);
}

/**
 * Match a local show to a TMDB show and sync metadata
 * @param localShowId - Local database show ID
 * @param tmdbId - TMDB show ID to match
 * @param syncSeasons - Whether to also sync season/episode metadata
 */
export async function matchShow(
  localShowId: number,
  tmdbId: number,
  syncSeasons = false
): Promise<void> {
  const tmdbShow = await getTVShowDetails(tmdbId);

  // Extract year from first air date
  const year = tmdbShow.first_air_date
    ? parseInt(tmdbShow.first_air_date.substring(0, 4), 10)
    : null;

  // Update the show with TMDB metadata
  await prisma.tVShow.update({
    where: { id: localShowId },
    data: {
      tmdbId: tmdbShow.id,
      year: year || undefined, // Only update if we have a year
      posterPath: tmdbShow.poster_path,
      backdropPath: tmdbShow.backdrop_path,
      description: tmdbShow.overview,
      firstAirDate: tmdbShow.first_air_date ? new Date(tmdbShow.first_air_date) : null,
      voteAverage: tmdbShow.vote_average,
      genres: JSON.stringify(tmdbShow.genres.map((g) => g.name)),
      networkStatus: tmdbShow.status,
      originalLanguage: tmdbShow.original_language,
      tmdbSeasonCount: tmdbShow.number_of_seasons,
      tmdbEpisodeCount: tmdbShow.number_of_episodes,
      lastMetadataSync: new Date(),
    },
  });

  if (syncSeasons) {
    await syncShowSeasons(localShowId, tmdbId);
  }
}

/**
 * Sync season and episode metadata for a matched show
 */
async function syncShowSeasons(localShowId: number, tmdbId: number): Promise<void> {
  // Get local seasons
  const localSeasons = await prisma.season.findMany({
    where: { tvShowId: localShowId },
    include: { episodes: true },
  });

  for (const localSeason of localSeasons) {
    try {
      const tmdbSeason = await fetchSeasonDetails(tmdbId, localSeason.seasonNumber);

      // Update season metadata
      await prisma.season.update({
        where: { id: localSeason.id },
        data: {
          tmdbSeasonId: tmdbSeason.id,
          name: tmdbSeason.name || null,
          posterPath: tmdbSeason.poster_path,
          description: tmdbSeason.overview,
          airDate: tmdbSeason.air_date ? new Date(tmdbSeason.air_date) : null,
        },
      });

      // Update episode metadata
      for (const localEpisode of localSeason.episodes) {
        // Match in order of priority:
        // 1. By existing tmdbEpisodeId (if already matched)
        // 2. By episode number
        // 3. By episode name (for cases where numbering differs between orderings)
        let tmdbEpisode = localEpisode.tmdbEpisodeId
          ? tmdbSeason.episodes.find((e) => e.id === localEpisode.tmdbEpisodeId)
          : null;

        if (!tmdbEpisode) {
          tmdbEpisode = tmdbSeason.episodes.find(
            (e) => e.episode_number === localEpisode.episodeNumber
          ) ?? null;
        }

        if (!tmdbEpisode && localEpisode.title) {
          // Try matching by episode name (case-insensitive)
          const localTitle = localEpisode.title.toLowerCase().trim();
          tmdbEpisode = tmdbSeason.episodes.find(
            (e) => e.name.toLowerCase().trim() === localTitle
          ) ?? null;
        }

        if (tmdbEpisode) {
          await prisma.episode.update({
            where: { id: localEpisode.id },
            data: {
              tmdbEpisodeId: tmdbEpisode.id,
              title: tmdbEpisode.name || localEpisode.title,
              stillPath: tmdbEpisode.still_path,
              description: tmdbEpisode.overview,
              airDate: tmdbEpisode.air_date ? new Date(tmdbEpisode.air_date) : null,
              runtime: tmdbEpisode.runtime,
              voteAverage: tmdbEpisode.vote_average,
            },
          });
        }
      }
    } catch (error) {
      // Log but continue with other seasons
      console.error(`Failed to sync season ${localSeason.seasonNumber}:`, error);
    }
  }
}

/**
 * Refresh metadata for an already-matched show
 * @param localShowId - Local database show ID
 */
export async function refreshShowMetadata(localShowId: number): Promise<void> {
  const show = await prisma.tVShow.findUnique({
    where: { id: localShowId },
  });

  if (!show?.tmdbId) {
    throw new Error('Show is not matched to TMDB');
  }

  await matchShow(localShowId, show.tmdbId, true);
}

/**
 * Get integration status (counts and sync state)
 */
export async function getIntegrationStatus(): Promise<{
  totalShows: number;
  matchedShows: number;
  unmatchedShows: number;
  lastSyncedShow: { title: string; syncedAt: Date } | null;
}> {
  const [totalShows, matchedShows, lastSynced] = await Promise.all([
    prisma.tVShow.count(),
    prisma.tVShow.count({ where: { tmdbId: { not: null } } }),
    prisma.tVShow.findFirst({
      where: { lastMetadataSync: { not: null } },
      orderBy: { lastMetadataSync: 'desc' },
      select: { title: true, lastMetadataSync: true },
    }),
  ]);

  return {
    totalShows,
    matchedShows,
    unmatchedShows: totalShows - matchedShows,
    lastSyncedShow: lastSynced?.lastMetadataSync
      ? { title: lastSynced.title, syncedAt: lastSynced.lastMetadataSync }
      : null,
  };
}

/**
 * Unmatch a show from TMDB (clear metadata)
 */
export async function unmatchShow(localShowId: number): Promise<void> {
  await prisma.tVShow.update({
    where: { id: localShowId },
    data: {
      tmdbId: null,
      posterPath: null,
      backdropPath: null,
      description: null,
      firstAirDate: null,
      voteAverage: null,
      genres: null,
      networkStatus: null,
      originalLanguage: null,
      tmdbSeasonCount: null,
      tmdbEpisodeCount: null,
      lastMetadataSync: null,
    },
  });

  // Also clear season/episode metadata
  const seasons = await prisma.season.findMany({
    where: { tvShowId: localShowId },
    select: { id: true },
  });

  for (const season of seasons) {
    await prisma.season.update({
      where: { id: season.id },
      data: {
        tmdbSeasonId: null,
        posterPath: null,
        description: null,
        airDate: null,
      },
    });

    await prisma.episode.updateMany({
      where: { seasonId: season.id },
      data: {
        tmdbEpisodeId: null,
        stillPath: null,
        description: null,
        airDate: null,
        runtime: null,
        voteAverage: null,
      },
    });
  }
}
