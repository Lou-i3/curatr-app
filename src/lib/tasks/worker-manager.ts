/**
 * Worker Manager
 *
 * Manages worker threads for running background tasks.
 * Keeps the main event loop completely free for HTTP requests.
 */

import { Worker } from 'worker_threads';
import { resolve, isAbsolute } from 'path';
import {
  TaskProgressTracker,
  scheduleCleanup,
} from './progress';
import type { TmdbTaskProgress } from './types';

// Worker message types
interface WorkerProgressMessage {
  type: 'progress';
  taskId: string;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  errors: Array<{ item: string; error: string }>;
}

interface WorkerCompleteMessage {
  type: 'complete';
  taskId: string;
}

interface WorkerFailMessage {
  type: 'fail';
  taskId: string;
  error: string;
}

type WorkerMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerFailMessage;

// Track active workers for cleanup
const activeWorkers = new Map<string, Worker>();

/**
 * Normalize database URL for worker threads
 * Converts relative file paths to absolute paths
 */
function normalizeDatabaseUrl(url: string): string {
  // Handle file: URLs for SQLite
  if (url.startsWith('file:')) {
    const path = url.substring(5);
    if (!isAbsolute(path)) {
      // Convert relative path to absolute
      return `file:${resolve(process.cwd(), path)}`;
    }
  }
  return url;
}

/**
 * Create inline worker code from the task worker module
 * This is a workaround for Next.js bundling issues with worker_threads
 */
function createInlineWorkerCode(): string {
  // This inline worker code is self-contained and doesn't need external imports
  // It receives database URL and task data via workerData
  return `
const { parentPort, workerData } = require('worker_threads');
const { PrismaClient } = require('@prisma/client');

// Create Prisma client with the provided database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: workerData.databaseUrl,
    },
  },
});

// Send message to main thread
function sendProgress(msg) {
  parentPort?.postMessage(msg);
}

// TMDB API helpers
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint, apiKey) {
  const response = await fetch(TMDB_API_BASE + endpoint, {
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('TMDB API error: ' + response.status);
  }

  return response.json();
}

async function autoMatchShow(title, year, apiKey) {
  const query = encodeURIComponent(title);
  const yearParam = year ? '&first_air_date_year=' + year : '';

  const response = await tmdbFetch('/search/tv?query=' + query + yearParam, apiKey);

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

async function matchShow(showId, tmdbId, apiKey, syncSeasons = false) {
  const details = await tmdbFetch('/tv/' + tmdbId, apiKey);

  await prisma.tVShow.update({
    where: { id: showId },
    data: {
      tmdbId: details.id,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      description: details.overview,
      voteAverage: details.vote_average,
      airDate: details.first_air_date ? new Date(details.first_air_date) : null,
      tmdbStatus: details.status,
      tmdbSeasonCount: details.number_of_seasons,
      tmdbEpisodeCount: details.number_of_episodes,
    },
  });

  if (syncSeasons && details.seasons) {
    await syncShowSeasons(showId, tmdbId, apiKey);
  }
}

async function syncShowSeasons(showId, tmdbId, apiKey) {
  const details = await tmdbFetch('/tv/' + tmdbId, apiKey);

  if (!details.seasons) return;

  for (const tmdbSeason of details.seasons) {
    const seasonDetails = await tmdbFetch('/tv/' + tmdbId + '/season/' + tmdbSeason.season_number, apiKey);

    const season = await prisma.season.upsert({
      where: {
        tvShowId_seasonNumber: {
          tvShowId: showId,
          seasonNumber: tmdbSeason.season_number,
        },
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

    await new Promise(r => setTimeout(r, 250));
  }
}

async function refreshShowMetadata(showId, apiKey) {
  const show = await prisma.tVShow.findUnique({
    where: { id: showId },
    select: { tmdbId: true },
  });

  if (!show?.tmdbId) {
    throw new Error('Show is not matched to TMDB');
  }

  const details = await tmdbFetch('/tv/' + show.tmdbId, apiKey);

  await prisma.tVShow.update({
    where: { id: showId },
    data: {
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      description: details.overview,
      voteAverage: details.vote_average,
      airDate: details.first_air_date ? new Date(details.first_air_date) : null,
      tmdbStatus: details.status,
      tmdbSeasonCount: details.number_of_seasons,
      tmdbEpisodeCount: details.number_of_episodes,
    },
  });

  await syncShowSeasons(showId, show.tmdbId, apiKey);
}

// Task runners
async function runBulkMatch(taskId, data) {
  const { apiKey, shows } = data;
  const errors = [];
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
      errors.push({ item: show.title, error: error.message || 'Unknown error' });
    }

    sendProgress({
      type: 'progress',
      taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise(r => setTimeout(r, 250));
  }

  sendProgress({ type: 'complete', taskId });
}

async function runBulkRefresh(taskId, data) {
  const { apiKey, shows } = data;
  const errors = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];

    try {
      await refreshShowMetadata(show.id, apiKey);
      succeeded++;
    } catch (error) {
      failed++;
      errors.push({ item: show.title, error: error.message || 'Unknown error' });
    }

    sendProgress({
      type: 'progress',
      taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise(r => setTimeout(r, 500));
  }

  sendProgress({ type: 'complete', taskId });
}

async function runRefreshMissing(taskId, data) {
  const { apiKey, shows } = data;
  const errors = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];

    try {
      await syncShowSeasons(show.id, show.tmdbId, apiKey);
      succeeded++;
    } catch (error) {
      failed++;
      errors.push({ item: show.title, error: error.message || 'Unknown error' });
    }

    sendProgress({
      type: 'progress',
      taskId,
      processed: i + 1,
      succeeded,
      failed,
      currentItem: show.title,
      errors,
    });

    await new Promise(r => setTimeout(r, 500));
  }

  sendProgress({ type: 'complete', taskId });
}

async function runSingleRefresh(taskId, data) {
  const { apiKey, showId, showTitle } = data;
  const errors = [];

  try {
    await refreshShowMetadata(showId, apiKey);
    sendProgress({
      type: 'progress',
      taskId,
      processed: 1,
      succeeded: 1,
      failed: 0,
      currentItem: showTitle,
      errors,
    });
  } catch (error) {
    errors.push({ item: showTitle, error: error.message || 'Unknown error' });
    sendProgress({
      type: 'progress',
      taskId,
      processed: 1,
      succeeded: 0,
      failed: 1,
      currentItem: showTitle,
      errors,
    });
  }

  sendProgress({ type: 'complete', taskId });
}

async function runImport(taskId, data) {
  const { showId, items } = data;
  const errors = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const seasonData of items) {
    const season = await prisma.season.upsert({
      where: {
        tvShowId_seasonNumber: {
          tvShowId: showId,
          seasonNumber: seasonData.seasonNumber,
        },
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
      const itemName = 'S' + seasonData.seasonNumber + 'E' + episodeData.episodeNumber;

      try {
        const existingEpisode = await prisma.episode.findUnique({
          where: {
            seasonId_episodeNumber: {
              seasonId: season.id,
              episodeNumber: episodeData.episodeNumber,
            },
          },
        });

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
            monitorStatus: episodeData.monitorStatus || 'WANTED',
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
        errors.push({ item: itemName, error: error.message || 'Unknown error' });
      }

      processed++;
      sendProgress({
        type: 'progress',
        taskId,
        processed,
        succeeded,
        failed,
        currentItem: itemName,
        errors,
      });
    }
  }

  sendProgress({ type: 'complete', taskId });
}

// Main handler
async function main() {
  const { taskId, taskType, taskData } = workerData;

  try {
    switch (taskType) {
      case 'tmdb-bulk-match':
        await runBulkMatch(taskId, taskData);
        break;
      case 'tmdb-bulk-refresh':
        await runBulkRefresh(taskId, taskData);
        break;
      case 'tmdb-refresh-missing':
        await runRefreshMissing(taskId, taskData);
        break;
      case 'tmdb-single-refresh':
        await runSingleRefresh(taskId, taskData);
        break;
      case 'tmdb-import':
        await runImport(taskId, taskData);
        break;
      default:
        sendProgress({ type: 'fail', taskId, error: 'Unknown task type: ' + taskType });
    }
  } catch (error) {
    sendProgress({ type: 'fail', taskId, error: error.message || 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
`;
}

/**
 * Run a task in a worker thread
 */
export function runInWorker(
  taskId: string,
  taskType: string,
  taskData: unknown,
  tracker: TaskProgressTracker<TmdbTaskProgress>
): void {
  const rawDatabaseUrl = process.env.DATABASE_URL;

  if (!rawDatabaseUrl) {
    tracker.fail('DATABASE_URL not configured');
    return;
  }

  // Normalize database URL for worker thread (convert relative paths to absolute)
  const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);

  try {
    const workerCode = createInlineWorkerCode();

    const worker = new Worker(workerCode, {
      eval: true,
      workerData: {
        taskId,
        taskType,
        taskData,
        databaseUrl,
      },
    });

    activeWorkers.set(taskId, worker);

    worker.on('message', (message: WorkerMessage) => {
      switch (message.type) {
        case 'progress':
          tracker.update({
            processed: message.processed,
            succeeded: message.succeeded,
            failed: message.failed,
            currentItem: message.currentItem,
            errors: message.errors,
          } as Partial<TmdbTaskProgress>);
          break;

        case 'complete':
          tracker.complete();
          scheduleCleanup(taskId);
          activeWorkers.delete(taskId);
          break;

        case 'fail':
          tracker.fail(message.error);
          scheduleCleanup(taskId);
          activeWorkers.delete(taskId);
          break;
      }
    });

    worker.on('error', (error) => {
      console.error(`Worker error for task ${taskId}:`, error);
      tracker.fail(error.message);
      scheduleCleanup(taskId);
      activeWorkers.delete(taskId);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker exited with code ${code} for task ${taskId}`);
        // Only mark as failed if not already completed
        const progress = tracker.getProgress();
        if (progress.status === 'running') {
          tracker.fail(`Worker exited unexpectedly with code ${code}`);
          scheduleCleanup(taskId);
        }
      }
      activeWorkers.delete(taskId);
    });
  } catch (error) {
    console.error(`Failed to create worker for task ${taskId}:`, error);
    tracker.fail(error instanceof Error ? error.message : 'Failed to create worker');
    scheduleCleanup(taskId);
  }
}

/**
 * Terminate a worker thread
 */
export function terminateWorker(taskId: string): boolean {
  const worker = activeWorkers.get(taskId);
  if (worker) {
    worker.terminate();
    activeWorkers.delete(taskId);
    return true;
  }
  return false;
}

/**
 * Check if a worker is active
 */
export function isWorkerActive(taskId: string): boolean {
  return activeWorkers.has(taskId);
}
