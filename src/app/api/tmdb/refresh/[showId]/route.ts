/**
 * Refresh metadata for a single show (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TMDB_CONFIG } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';

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
    // Ensure task queue settings are loaded from DB
    await ensureSettingsLoaded();

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

    // Create task tracker with custom title for the specific show
    const tracker = createTmdbTask('tmdb-bulk-refresh', `TMDB Refresh: ${show.title}`);
    tracker.setTotal(1);

    // Run task in a separate worker thread
    runInWorker(tracker.getTaskId(), 'tmdb-single-refresh', {
      apiKey: TMDB_CONFIG.apiKey,
      showId: id,
      showTitle: show.title,
    }, tracker);

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: 'running',
      message: 'Refresh started in background',
    });
  } catch (error) {
    console.error('Refresh metadata failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to refresh metadata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
