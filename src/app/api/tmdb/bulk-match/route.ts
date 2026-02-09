/**
 * TMDB bulk match API route
 * POST /api/tmdb/bulk-match - Start auto-matching unmatched shows (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 *
 * @swagger
 * /api/tmdb/bulk-match:
 *   post:
 *     summary: Auto-match all unmatched shows to TMDB
 *     description: Starts a background task that automatically matches all unmatched local shows to TMDB entries.
 *     tags: [TMDB]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Bulk match task started or no unmatched shows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskId:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   $ref: '#/components/schemas/TaskStatus'
 *                 total:
 *                   type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: TMDB not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTmdbConfigured } from '@/lib/tmdb';
import { getTmdbApiKey } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  try {
    const authError = await checkAdmin();
    if (authError) return authError;

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
      apiKey: getTmdbApiKey(),
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
