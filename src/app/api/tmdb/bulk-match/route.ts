/**
 * TMDB bulk match API route
 * POST /api/tmdb/bulk-match - Start auto-matching unmatched shows (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTmdbConfigured } from '@/lib/tmdb';
import { TMDB_CONFIG } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  try {
    // Ensure task queue settings are loaded from DB
    await ensureSettingsLoaded();
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

    // Create task tracker
    const tracker = createTmdbTask('tmdb-bulk-match');
    tracker.setTotal(unmatchedShows.length);

    // Run task in a separate worker thread
    runInWorker(tracker.getTaskId(), 'tmdb-bulk-match', {
      apiKey: TMDB_CONFIG.apiKey,
      shows: unmatchedShows,
    }, tracker);

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: 'running',
      total: unmatchedShows.length,
      message: 'Bulk match started in background',
    });
  } catch (error) {
    console.error('Bulk match error:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk match' },
      { status: 500 }
    );
  }
}
