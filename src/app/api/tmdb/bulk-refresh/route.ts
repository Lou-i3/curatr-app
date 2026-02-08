/**
 * Bulk refresh metadata for all matched shows (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTmdbApiKey, isTmdbConfigured } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 400 }
    );
  }

  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    // Ensure task queue settings are loaded from DB
    await ensureSettingsLoaded();

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

    // Create task tracker
    const tracker = createTmdbTask('tmdb-bulk-refresh');
    tracker.setTotal(matchedShows.length);

    // Run task in a separate worker thread
    runInWorker(tracker.getTaskId(), 'tmdb-bulk-refresh', {
      apiKey: getTmdbApiKey(),
      shows: matchedShows,
    }, tracker);

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: 'running',
      total: matchedShows.length,
      message: 'Bulk refresh started in background',
    });
  } catch (error) {
    console.error('Bulk refresh failed:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk refresh' },
      { status: 500 }
    );
  }
}
