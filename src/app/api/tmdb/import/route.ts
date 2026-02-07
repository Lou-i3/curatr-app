/**
 * TMDB Import API (non-blocking)
 * Creates selected seasons and episodes in database as a background task
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ImportRequest } from '@/lib/tmdb/types';
import { createTmdbTask, runInWorker } from '@/lib/tasks';

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

    // Run task in a separate worker thread
    runInWorker(tracker.getTaskId(), 'tmdb-import', {
      showId,
      showTitle: show.title,
      items,
    }, tracker);

    return NextResponse.json({
      taskId: tracker.getTaskId(),
      status: 'running',
      total: totalEpisodes,
      message: 'Import started in background',
    });
  } catch (error) {
    console.error('Failed to start import:', error);
    return NextResponse.json(
      { error: 'Failed to start import' },
      { status: 500 }
    );
  }
}
