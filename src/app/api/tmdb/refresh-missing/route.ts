/**
 * TMDB Refresh Missing Metadata API
 * POST /api/tmdb/refresh-missing - Sync seasons/episodes for shows that need it (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 */

import { NextResponse } from 'next/server';
import { isTmdbConfigured, getShowsNeedingSync } from '@/lib/tmdb';
import { TMDB_CONFIG } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB is not configured' },
      { status: 400 }
    );
  }

  try {
    // Ensure task queue settings are loaded from DB
    await ensureSettingsLoaded();

    const showsNeedingSync = await getShowsNeedingSync();

    if (showsNeedingSync.length === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: 'All shows are already synced',
      });
    }

    // Create task tracker
    const tracker = createTmdbTask('tmdb-refresh-missing');
    tracker.setTotal(showsNeedingSync.length);

    // Run task in a separate worker thread
    runInWorker(tracker.getTaskId(), 'tmdb-refresh-missing', {
      apiKey: TMDB_CONFIG.apiKey,
      shows: showsNeedingSync,
    }, tracker);

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: 'running',
      total: showsNeedingSync.length,
      message: 'Refresh started in background',
    });
  } catch (error) {
    console.error('TMDB refresh missing error:', error);
    return NextResponse.json(
      { error: 'Failed to start refresh missing metadata' },
      { status: 500 }
    );
  }
}
