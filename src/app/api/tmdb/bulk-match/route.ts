/**
 * TMDB bulk match API route
 * POST /api/tmdb/bulk-match - Start auto-matching unmatched shows (non-blocking)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoMatchShow, matchShow, isTmdbConfigured } from '@/lib/tmdb';
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
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  try {
    // Get all unmatched shows
    const unmatchedShows = await prisma.tVShow.findMany({
      where: { tmdbId: null },
      select: { id: true, title: true, year: true },
    });

    if (unmatchedShows.length === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: 'No unmatched shows found',
      });
    }

    // Create task tracker (may be pending if queue is full)
    const tracker = createTmdbTask('tmdb-bulk-match');
    tracker.setTotal(unmatchedShows.length);

    const runTask = () => runBulkMatch(tracker, unmatchedShows);

    // Check if task is pending (queued) or can run now
    const status = tracker.getProgress().status;
    if (status === 'pending') {
      // Queue the run function for later
      queueTaskRun(tracker.getTaskId(), runTask);
    } else {
      // Start background processing immediately (fire and forget)
      runTask().catch((error) => {
        console.error('Bulk match task failed:', error);
        tracker.fail(error instanceof Error ? error.message : 'Unknown error');
      });
    }

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: status,
      total: unmatchedShows.length,
      message: status === 'pending' ? 'Bulk match queued' : 'Bulk match started',
    });
  } catch (error) {
    console.error('Bulk match error:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk match' },
      { status: 500 }
    );
  }
}

/**
 * Run bulk matching in background
 */
async function runBulkMatch(
  tracker: TaskProgressTracker<TmdbTaskProgress>,
  shows: Array<{ id: number; title: string; year: number | null }>
): Promise<void> {
  for (const show of shows) {
    // Check for cancellation
    if (isCancelled(tracker.getTaskId())) {
      tracker.cancel();
      scheduleCleanup(tracker.getTaskId());
      return;
    }

    try {
      const match = await autoMatchShow(show.title, show.year ?? undefined);

      if (match) {
        // High confidence match - apply it
        await matchShow(show.id, match.tmdbShow.id, false);
        tracker.incrementSuccess(show.title);
      } else {
        // No confident match found - count as failed (skipped)
        tracker.incrementFailed(show.title, 'No confident match found');
      }
    } catch (error) {
      tracker.incrementFailed(
        show.title,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Yield to event loop and rate limit
    await yieldToEventLoop();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  tracker.complete();
  scheduleCleanup(tracker.getTaskId());
}
