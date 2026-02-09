/**
 * TMDB Refresh Missing Metadata API
 * POST /api/tmdb/refresh-missing - Sync seasons/episodes for shows that need it (non-blocking)
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 *
 * @swagger
 * /api/tmdb/refresh-missing:
 *   post:
 *     summary: Sync missing metadata for matched shows
 *     description: Starts a background task that syncs seasons and episodes from TMDB for matched shows that are missing metadata.
 *     tags: [TMDB]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Refresh task started or all shows already synced
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
import { isTmdbConfigured, getShowsNeedingSync } from '@/lib/tmdb';
import { getTmdbApiKey } from '@/lib/tmdb/config';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB is not configured' },
      { status: 400 }
    );
  }

  try {
    const authError = await checkAdmin();
    if (authError) return authError;

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
      apiKey: getTmdbApiKey(),
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
