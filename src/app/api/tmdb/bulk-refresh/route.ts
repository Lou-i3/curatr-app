/**
 * Bulk refresh metadata for all matched shows (non-blocking)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshShowMetadata } from '@/lib/tmdb/service';
import { TMDB_CONFIG } from '@/lib/tmdb/config';
import {
  createTmdbTask,
  isCancelled,
  yieldToEventLoop,
  scheduleCleanup,
  queueTaskRun,
  type TaskProgressTracker,
  type TmdbTaskProgress,
} from '@/lib/tasks';

export async function POST() {
  if (!TMDB_CONFIG.apiKey) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 400 }
    );
  }

  try {
    // Get all matched shows
    const matchedShows = await prisma.tVShow.findMany({
      where: { tmdbId: { not: null } },
      select: { id: true, title: true },
    });

    if (matchedShows.length === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: 'No matched shows found',
      });
    }

    // Create task tracker (may be pending if queue is full)
    const tracker = createTmdbTask('tmdb-bulk-refresh');
    tracker.setTotal(matchedShows.length);

    const runTask = () => runBulkRefresh(tracker, matchedShows);

    // Check if task is pending (queued) or can run now
    const status = tracker.getProgress().status;
    if (status === 'pending') {
      queueTaskRun(tracker.getTaskId(), runTask);
    } else {
      runTask().catch((error) => {
        console.error('Bulk refresh task failed:', error);
        tracker.fail(error instanceof Error ? error.message : 'Unknown error');
      });
    }

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: status,
      total: matchedShows.length,
      message: status === 'pending' ? 'Bulk refresh queued' : 'Bulk refresh started',
    });
  } catch (error) {
    console.error('Bulk refresh failed:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk refresh' },
      { status: 500 }
    );
  }
}

/**
 * Run bulk refresh in background
 */
async function runBulkRefresh(
  tracker: TaskProgressTracker<TmdbTaskProgress>,
  shows: Array<{ id: number; title: string }>
): Promise<void> {
  for (const show of shows) {
    // Check for cancellation
    if (isCancelled(tracker.getTaskId())) {
      tracker.cancel();
      scheduleCleanup(tracker.getTaskId());
      return;
    }

    try {
      await refreshShowMetadata(show.id);
      tracker.incrementSuccess(show.title);
    } catch (error) {
      tracker.incrementFailed(
        show.title,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Yield to event loop and rate limit (TMDB allows 40 requests per 10 seconds)
    await yieldToEventLoop();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  tracker.complete();
  scheduleCleanup(tracker.getTaskId());
}
