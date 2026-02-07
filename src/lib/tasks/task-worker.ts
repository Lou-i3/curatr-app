/**
 * Task Worker - Runs background tasks in a separate thread
 *
 * This file runs in a Node.js worker thread, completely separate from the Next.js app.
 * It handles TMDB operations and database updates without blocking the main event loop.
 *
 * Compiled to JavaScript via esbuild (npm run build:worker)
 */

import { parentPort, workerData } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// =============================================================================
// Types
// =============================================================================

interface WorkerData {
  taskId: string;
  taskType: string;
  taskData: unknown;
  databaseUrl: string;
  modulePaths?: string[];
}

interface ProgressUpdate {
  taskId: string;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ item: string; error: string }>;
}

interface TMDBShowDetails {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  first_air_date?: string;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TMDBSeason[];
}

interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  overview?: string;
  poster_path?: string | null;
  air_date?: string;
  episodes?: TMDBEpisode[];
}

interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  overview?: string;
  still_path?: string | null;
  air_date?: string;
  runtime?: number;
  vote_average?: number;
}

interface TMDBSearchResponse {
  results: Array<{
    id: number;
    name: string;
    first_air_date?: string;
  }>;
}

interface BulkMatchData {
  apiKey: string;
  shows: Array<{ id: number; title: string; year?: number | null }>;
}

interface BulkRefreshData {
  apiKey: string;
  shows: Array<{ id: number; title: string; tmdbId: number }>;
}

interface SingleRefreshData {
  apiKey: string;
  showId: number;
  showTitle: string;
}

interface ImportSeasonData {
  seasonNumber: number;
  name: string;
  tmdbSeasonId?: number;
  posterPath?: string | null;
  description?: string;
  airDate?: string;
  episodes: Array<{
    episodeNumber: number;
    title: string;
    tmdbEpisodeId?: number;
    stillPath?: string | null;
    description?: string;
    airDate?: string;
    runtime?: number;
    voteAverage?: number;
    monitorStatus?: string;
  }>;
}

interface ImportData {
  showId: number;
  items: ImportSeasonData[];
}

// =============================================================================
// Setup
// =============================================================================

const data = workerData as WorkerData;

// Add module paths for dependency resolution (needed for Docker standalone)
if (data.modulePaths) {
  module.paths.unshift(...data.modulePaths);
}

// Initialize Prisma with better-sqlite3 adapter
const adapter = new PrismaBetterSqlite3({ url: data.databaseUrl });
const prisma = new PrismaClient({ adapter });

// =============================================================================
// Message Helpers
// =============================================================================

function sendProgress(update: ProgressUpdate): void {
  parentPort?.postMessage({ type: 'progress', ...update });
}

function sendComplete(): void {
  parentPort?.postMessage({ type: 'complete', taskId: data.taskId });
}

function sendFail(error: string): void {
  parentPort?.postMessage({ type: 'fail', taskId: data.taskId, error });
}

// =============================================================================
// TMDB API
// =============================================================================

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch<T>(endpoint: string, apiKey: string): Promise<T> {
  const response = await fetch(TMDB_API_BASE + endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

interface AutoMatchResult {
  tmdbId: number;
  confidence: number;
}

async function autoMatchShow(
  title: string,
  year: number | null | undefined,
  apiKey: string
): Promise<AutoMatchResult | null> {
  const query = encodeURIComponent(title);
  const yearParam = year ? `&first_air_date_year=${year}` : '';
  const response = await tmdbFetch<TMDBSearchResponse>(
    `/search/tv?query=${query}${yearParam}`,
    apiKey
  );

  if (!response.results || response.results.length === 0) {
    return null;
  }

  const normalizedTitle = title.toLowerCase().trim();

  for (const result of response.results) {
    const resultTitle = result.name.toLowerCase().trim();
    const resultYear = result.first_air_date?.substring(0, 4);

    if (resultTitle === normalizedTitle) {
      if (!year || resultYear === String(year)) {
        return { tmdbId: result.id, confidence: 1.0 };
      }
      return { tmdbId: result.id, confidence: 0.9 };
    }
  }

  const firstResult = response.results[0];
  const firstTitle = firstResult.name.toLowerCase().trim();

  if (firstTitle.includes(normalizedTitle) || normalizedTitle.includes(firstTitle)) {
    return { tmdbId: firstResult.id, confidence: 0.7 };
  }

  return null;
}

// =============================================================================
// Database Operations
// =============================================================================

async function matchShow(
  showId: number,
  tmdbId: number,
  apiKey: string,
  syncSeasons = false
): Promise<void> {
  const details = await tmdbFetch<TMDBShowDetails>(`/tv/${tmdbId}`, apiKey);

  await prisma.tVShow.update({
    where: { id: showId },
    data: {
      tmdbId: details.id,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      description: details.overview,
      voteAverage: details.vote_average,
      firstAirDate: details.first_air_date ? new Date(details.first_air_date) : null,
      networkStatus: details.status,
      tmdbSeasonCount: details.number_of_seasons,
      tmdbEpisodeCount: details.number_of_episodes,
      lastMetadataSync: new Date(),
    },
  });

  if (syncSeasons && details.seasons) {
    await syncShowSeasons(showId, tmdbId, apiKey);
  }
}

async function syncShowSeasons(
  showId: number,
  tmdbId: number,
  apiKey: string
): Promise<void> {
  const details = await tmdbFetch<TMDBShowDetails>(`/tv/${tmdbId}`, apiKey);
  if (!details.seasons) return;

  for (const tmdbSeason of details.seasons) {
    const seasonDetails = await tmdbFetch<TMDBSeason>(
      `/tv/${tmdbId}/season/${tmdbSeason.season_number}`,
      apiKey
    );

    const season = await prisma.season.upsert({
      where: {
        tvShowId_seasonNumber: { tvShowId: showId, seasonNumber: tmdbSeason.season_number },
      },
      create: {
        tvShowId: showId,
        seasonNumber: tmdbSeason.season_number,
        name: tmdbSeason.name,
        tmdbSeasonId: tmdbSeason.id,
        posterPath: tmdbSeason.poster_path,
        description: tmdbSeason.overview,
        airDate: tmdbSeason.air_date ? new Date(tmdbSeason.air_date) : null,
      },
      update: {
        name: tmdbSeason.name,
        tmdbSeasonId: tmdbSeason.id,
        posterPath: tmdbSeason.poster_path,
        description: tmdbSeason.overview,
        airDate: tmdbSeason.air_date ? new Date(tmdbSeason.air_date) : null,
      },
    });

    if (seasonDetails.episodes) {
      for (const tmdbEpisode of seasonDetails.episodes) {
        await prisma.episode.upsert({
          where: {
            seasonId_episodeNumber: {
              seasonId: season.id,
              episodeNumber: tmdbEpisode.episode_number,
            },
          },
          create: {
            seasonId: season.id,
            episodeNumber: tmdbEpisode.episode_number,
            title: tmdbEpisode.name,
            tmdbEpisodeId: tmdbEpisode.id,
            stillPath: tmdbEpisode.still_path,
            description: tmdbEpisode.overview,
            airDate: tmdbEpisode.air_date ? new Date(tmdbEpisode.air_date) : null,
            runtime: tmdbEpisode.runtime,
            voteAverage: tmdbEpisode.vote_average,
          },
          update: {
            title: tmdbEpisode.name,
            tmdbEpisodeId: tmdbEpisode.id,
            stillPath: tmdbEpisode.still_path,
            description: tmdbEpisode.overview,
            airDate: tmdbEpisode.air_date ? new Date(tmdbEpisode.air_date) : null,
            runtime: tmdbEpisode.runtime,
            voteAverage: tmdbEpisode.vote_average,
          },
        });
      }
    }

    await new Promise((r) => setTimeout(r, 250)); // Rate limit
  }
}

async function refreshShowMetadata(showId: number, apiKey: string): Promise<void> {
  const show = await prisma.tVShow.findUnique({
    where: { id: showId },
    select: { tmdbId: true },
  });

  if (!show?.tmdbId) {
    throw new Error('Show is not matched to TMDB');
  }

  const details = await tmdbFetch<TMDBShowDetails>(`/tv/${show.tmdbId}`, apiKey);

  await prisma.tVShow.update({
    where: { id: showId },
    data: {
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      description: details.overview,
      voteAverage: details.vote_average,
      firstAirDate: details.first_air_date ? new Date(details.first_air_date) : null,
      networkStatus: details.status,
      tmdbSeasonCount: details.number_of_seasons,
      tmdbEpisodeCount: details.number_of_episodes,
      lastMetadataSync: new Date(),
    },
  });

  // Only update EXISTING seasons/episodes, don't create new ones
  await updateExistingSeasonMetadata(showId, show.tmdbId, apiKey);
}

/**
 * Update metadata for existing seasons/episodes only (no creation)
 */
async function updateExistingSeasonMetadata(
  showId: number,
  tmdbId: number,
  apiKey: string
): Promise<void> {
  // Get existing seasons from our database
  const existingSeasons = await prisma.season.findMany({
    where: { tvShowId: showId },
    select: { id: true, seasonNumber: true },
  });

  if (existingSeasons.length === 0) return;

  for (const season of existingSeasons) {
    try {
      const seasonDetails = await tmdbFetch<TMDBSeason>(
        `/tv/${tmdbId}/season/${season.seasonNumber}`,
        apiKey
      );

      // Update season metadata
      await prisma.season.update({
        where: { id: season.id },
        data: {
          name: seasonDetails.name,
          tmdbSeasonId: seasonDetails.id,
          posterPath: seasonDetails.poster_path,
          description: seasonDetails.overview,
          airDate: seasonDetails.air_date ? new Date(seasonDetails.air_date) : null,
        },
      });

      // Update existing episodes only
      if (seasonDetails.episodes) {
        const existingEpisodes = await prisma.episode.findMany({
          where: { seasonId: season.id },
          select: { id: true, episodeNumber: true },
        });

        for (const episode of existingEpisodes) {
          const tmdbEpisode = seasonDetails.episodes.find(
            (e) => e.episode_number === episode.episodeNumber
          );

          if (tmdbEpisode) {
            await prisma.episode.update({
              where: { id: episode.id },
              data: {
                title: tmdbEpisode.name,
                tmdbEpisodeId: tmdbEpisode.id,
                stillPath: tmdbEpisode.still_path,
                description: tmdbEpisode.overview,
                airDate: tmdbEpisode.air_date ? new Date(tmdbEpisode.air_date) : null,
                runtime: tmdbEpisode.runtime,
                voteAverage: tmdbEpisode.vote_average,
              },
            });
          }
        }
      }

      await new Promise((r) => setTimeout(r, 250)); // Rate limit
    } catch {
      // Skip seasons that don't exist on TMDB (e.g., specials)
      continue;
    }
  }
}

// =============================================================================
// Task Runners
// =============================================================================

async function runBulkMatch(taskData: BulkMatchData): Promise<void> {
  const { apiKey, shows } = taskData;
  const errors: Array<{ item: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];

    try {
      const match = await autoMatchShow(show.title, show.year, apiKey);

      if (match && match.confidence >= 0.7) {
        await matchShow(show.id, match.tmdbId, apiKey, false);
        succeeded++;
      } else {
        failed++;
        errors.push({ item: show.title, error: 'No confident match found' });
      }
    } catch (error) {
      failed++;
      errors.push({
        item: show.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    sendProgress({
      taskId: data.taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise((r) => setTimeout(r, 250)); // Rate limit
  }

  sendComplete();
}

async function runBulkRefresh(taskData: BulkRefreshData): Promise<void> {
  const { apiKey, shows } = taskData;
  const errors: Array<{ item: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];

    try {
      await refreshShowMetadata(show.id, apiKey);
      succeeded++;
    } catch (error) {
      failed++;
      errors.push({
        item: show.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    sendProgress({
      taskId: data.taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise((r) => setTimeout(r, 500)); // Rate limit
  }

  sendComplete();
}

async function runRefreshMissing(taskData: BulkRefreshData): Promise<void> {
  const { apiKey, shows } = taskData;
  const errors: Array<{ item: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];

    try {
      await syncShowSeasons(show.id, show.tmdbId, apiKey);
      succeeded++;
    } catch (error) {
      failed++;
      errors.push({
        item: show.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    sendProgress({
      taskId: data.taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise((r) => setTimeout(r, 500)); // Rate limit
  }

  sendComplete();
}

async function runSingleRefresh(taskData: SingleRefreshData): Promise<void> {
  const { apiKey, showId, showTitle } = taskData;
  const errors: Array<{ item: string; error: string }> = [];

  try {
    await refreshShowMetadata(showId, apiKey);
    sendProgress({
      taskId: data.taskId,
      processed: 1,
      succeeded: 1,
      failed: 0,
      currentItem: showTitle,
      errors,
    });
  } catch (error) {
    errors.push({
      item: showTitle,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    sendProgress({
      taskId: data.taskId,
      processed: 1,
      succeeded: 0,
      failed: 1,
      currentItem: showTitle,
      errors,
    });
  }

  sendComplete();
}

async function runImport(taskData: ImportData): Promise<void> {
  const { showId, items } = taskData;
  const errors: Array<{ item: string; error: string }> = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const seasonData of items) {
    const season = await prisma.season.upsert({
      where: {
        tvShowId_seasonNumber: { tvShowId: showId, seasonNumber: seasonData.seasonNumber },
      },
      create: {
        tvShowId: showId,
        seasonNumber: seasonData.seasonNumber,
        name: seasonData.name,
        tmdbSeasonId: seasonData.tmdbSeasonId,
        posterPath: seasonData.posterPath,
        description: seasonData.description,
        airDate: seasonData.airDate ? new Date(seasonData.airDate) : null,
      },
      update: {
        name: seasonData.name,
        tmdbSeasonId: seasonData.tmdbSeasonId,
        posterPath: seasonData.posterPath,
        description: seasonData.description,
        airDate: seasonData.airDate ? new Date(seasonData.airDate) : null,
      },
    });

    for (const episodeData of seasonData.episodes) {
      const itemName = `S${seasonData.seasonNumber}E${episodeData.episodeNumber}`;

      try {
        await prisma.episode.upsert({
          where: {
            seasonId_episodeNumber: {
              seasonId: season.id,
              episodeNumber: episodeData.episodeNumber,
            },
          },
          create: {
            seasonId: season.id,
            episodeNumber: episodeData.episodeNumber,
            title: episodeData.title,
            tmdbEpisodeId: episodeData.tmdbEpisodeId,
            stillPath: episodeData.stillPath,
            description: episodeData.description,
            airDate: episodeData.airDate ? new Date(episodeData.airDate) : null,
            runtime: episodeData.runtime,
            voteAverage: episodeData.voteAverage,
            monitorStatus: (episodeData.monitorStatus as 'WANTED' | 'UNWANTED') || 'WANTED',
          },
          update: {
            title: episodeData.title,
            tmdbEpisodeId: episodeData.tmdbEpisodeId,
            stillPath: episodeData.stillPath,
            description: episodeData.description,
            airDate: episodeData.airDate ? new Date(episodeData.airDate) : null,
            runtime: episodeData.runtime,
            voteAverage: episodeData.voteAverage,
          },
        });

        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          item: itemName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      processed++;
      sendProgress({
        taskId: data.taskId,
        processed,
        succeeded,
        failed,
        currentItem: itemName,
        errors,
      });
    }
  }

  sendComplete();
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  const { taskType, taskData } = data;

  try {
    switch (taskType) {
      case 'tmdb-bulk-match':
        await runBulkMatch(taskData as BulkMatchData);
        break;
      case 'tmdb-bulk-refresh':
        await runBulkRefresh(taskData as BulkRefreshData);
        break;
      case 'tmdb-refresh-missing':
        await runRefreshMissing(taskData as BulkRefreshData);
        break;
      case 'tmdb-single-refresh':
        await runSingleRefresh(taskData as SingleRefreshData);
        break;
      case 'tmdb-import':
        await runImport(taskData as ImportData);
        break;
      default:
        sendFail(`Unknown task type: ${taskType}`);
    }
  } catch (error) {
    sendFail(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
