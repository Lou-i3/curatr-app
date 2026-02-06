/**
 * TMDB Import API (non-blocking)
 * Creates selected seasons and episodes in database as a background task
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ImportRequest, ImportResult } from '@/lib/tmdb/types';
import {
  createTmdbTask,
  scheduleCleanup,
  queueTaskRun,
  type TaskProgressTracker,
  type TmdbTaskProgress,
} from '@/lib/tasks';

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();
    const { showId, items } = body;

    if (!showId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verify show exists
    const show = await prisma.tVShow.findUnique({
      where: { id: showId },
      select: { id: true, title: true },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Count total episodes to import
    const totalEpisodes = items.reduce((sum, s) => sum + s.episodes.length, 0);

    if (totalEpisodes === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: 'No episodes to import',
      });
    }

    // Create task tracker
    const tracker = createTmdbTask('tmdb-import');
    tracker.setTotal(totalEpisodes);

    const runTask = () => runImport(tracker, showId, show.title, items);

    // Check if task is pending (queued) or can run now
    const status = tracker.getProgress().status;
    if (status === 'pending') {
      queueTaskRun(tracker.getTaskId(), runTask);
    } else {
      runTask().catch((error) => {
        console.error('Import task failed:', error);
        tracker.fail(error instanceof Error ? error.message : 'Unknown error');
      });
    }

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: status,
      total: totalEpisodes,
      message: status === 'pending' ? 'Import queued' : 'Import started',
    });
  } catch (error) {
    console.error('Failed to start import:', error);
    return NextResponse.json(
      { error: 'Failed to start import' },
      { status: 500 }
    );
  }
}

/**
 * Run import in background
 */
async function runImport(
  tracker: TaskProgressTracker<TmdbTaskProgress>,
  showId: number,
  showTitle: string,
  items: ImportRequest['items']
): Promise<void> {
  let seasonsCreated = 0;
  let seasonsUpdated = 0;
  let episodesCreated = 0;
  let episodesUpdated = 0;

  try {
    for (const seasonData of items) {
      // Upsert season
      const existingSeason = await prisma.season.findUnique({
        where: {
          tvShowId_seasonNumber: {
            tvShowId: showId,
            seasonNumber: seasonData.seasonNumber,
          },
        },
      });

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

      if (existingSeason) {
        seasonsUpdated++;
      } else {
        seasonsCreated++;
      }

      // Upsert episodes
      for (const episodeData of seasonData.episodes) {
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
              monitorStatus: episodeData.monitorStatus,
            },
            update: {
              title: episodeData.title,
              tmdbEpisodeId: episodeData.tmdbEpisodeId,
              stillPath: episodeData.stillPath,
              description: episodeData.description,
              airDate: episodeData.airDate ? new Date(episodeData.airDate) : null,
              runtime: episodeData.runtime,
              voteAverage: episodeData.voteAverage,
              // Don't override monitorStatus if episode already exists
              ...(existingEpisode ? {} : { monitorStatus: episodeData.monitorStatus }),
            },
          });

          if (existingEpisode) {
            episodesUpdated++;
          } else {
            episodesCreated++;
          }

          tracker.incrementSuccess(`S${seasonData.seasonNumber}E${episodeData.episodeNumber}`);
        } catch (error) {
          tracker.incrementFailed(
            `S${seasonData.seasonNumber}E${episodeData.episodeNumber}`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    }

    tracker.complete();
  } catch (error) {
    tracker.fail(error instanceof Error ? error.message : 'Import failed');
  }

  scheduleCleanup(tracker.getTaskId());
}
