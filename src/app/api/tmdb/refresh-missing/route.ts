/**
 * TMDB Refresh Missing Metadata API
 * POST /api/tmdb/refresh-missing - Sync seasons/episodes for shows that need it (non-blocking)
 */

import { NextResponse } from 'next/server';
import { isTmdbConfigured, getShowsNeedingSync, syncShowSeasons } from '@/lib/tmdb';
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
      { error: 'TMDB is not configured' },
      { status: 400 }
    );
  }

  try {
    const showsNeedingSync = await getShowsNeedingSync();

    if (showsNeedingSync.length === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: 'All shows are already synced',
      });
    }

    // Create task tracker (may be pending if queue is full)
    const tracker = createTmdbTask('tmdb-refresh-missing');
    tracker.setTotal(showsNeedingSync.length);

    const runTask = () => runRefreshMissing(tracker, showsNeedingSync);

    // Check if task is pending (queued) or can run now
    const status = tracker.getProgress().status;
    if (status === 'pending') {
      queueTaskRun(tracker.getTaskId(), runTask);
    } else {
      runTask().catch((error) => {
        console.error('Refresh missing task failed:', error);
        tracker.fail(error instanceof Error ? error.message : 'Unknown error');
      });
    }

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: status,
      total: showsNeedingSync.length,
      message: status === 'pending' ? 'Refresh queued' : 'Refresh started',
    });
  } catch (error) {
    console.error('TMDB refresh missing error:', error);
    return NextResponse.json(
      { error: 'Failed to start refresh missing metadata' },
      { status: 500 }
    );
  }
}

/**
 * Run refresh missing in background
 */
async function runRefreshMissing(
  tracker: TaskProgressTracker<TmdbTaskProgress>,
  shows: Array<{ id: number; title: string; tmdbId: number }>
): Promise<void> {
  for (const show of shows) {
    // Check for cancellation
    if (isCancelled(tracker.getTaskId())) {
      tracker.cancel();
      scheduleCleanup(tracker.getTaskId());
      return;
    }

    try {
      await syncShowSeasons(show.id, show.tmdbId);
      tracker.incrementSuccess(show.title);
    } catch (error) {
      tracker.incrementFailed(
        show.title,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Yield to event loop and rate limit
    await yieldToEventLoop();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  tracker.complete();
  scheduleCleanup(tracker.getTaskId());
}
