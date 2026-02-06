/**
 * Refresh metadata for a single show (non-blocking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshShowMetadata } from '@/lib/tmdb/service';
import { TMDB_CONFIG } from '@/lib/tmdb/config';
import {
  createTmdbTask,
  scheduleCleanup,
  queueTaskRun,
  type TaskProgressTracker,
  type TmdbTaskProgress,
} from '@/lib/tasks';

interface Params {
  params: Promise<{ showId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!TMDB_CONFIG.apiKey) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 400 }
    );
  }

  try {
    const { showId } = await params;
    const id = parseInt(showId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
    }

    // Get show title for progress display
    const show = await prisma.tVShow.findUnique({
      where: { id },
      select: { title: true, tmdbId: true },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!show.tmdbId) {
      return NextResponse.json({ error: 'Show is not matched to TMDB' }, { status: 400 });
    }

    // Create task tracker
    const tracker = createTmdbTask('tmdb-bulk-refresh'); // Use bulk-refresh type for single show too
    tracker.setTotal(1);

    const runTask = () => runRefresh(tracker, id, show.title);

    // Check if task is pending (queued) or can run now
    const status = tracker.getProgress().status;
    if (status === 'pending') {
      queueTaskRun(tracker.getTaskId(), runTask);
    } else {
      runTask().catch((error) => {
        console.error('Single show refresh failed:', error);
        tracker.fail(error instanceof Error ? error.message : 'Unknown error');
      });
    }

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: status,
      message: status === 'pending' ? 'Refresh queued' : 'Refresh started',
    });
  } catch (error) {
    console.error('Refresh metadata failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to refresh metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Run refresh in background
 */
async function runRefresh(
  tracker: TaskProgressTracker<TmdbTaskProgress>,
  showId: number,
  showTitle: string
): Promise<void> {
  try {
    await refreshShowMetadata(showId);
    tracker.incrementSuccess(showTitle);
  } catch (error) {
    tracker.incrementFailed(
      showTitle,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  tracker.complete();
  scheduleCleanup(tracker.getTaskId());
}
