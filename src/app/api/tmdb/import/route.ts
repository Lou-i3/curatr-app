/**
 * TMDB Import API (non-blocking)
 * Creates selected seasons and episodes in database as a background task
 *
 * Runs in a separate worker thread to avoid blocking the main event loop.
 *
 * @swagger
 * /api/tmdb/import:
 *   post:
 *     summary: Import seasons and episodes from TMDB
 *     description: Starts a background task that creates selected seasons and episodes in the database from TMDB data.
 *     tags: [TMDB]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [showId, items]
 *             properties:
 *               showId:
 *                 type: integer
 *                 description: Local show ID
 *               items:
 *                 type: array
 *                 description: Seasons and episodes to import
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import task started or no episodes to import
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
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Show not found
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
import type { ImportRequest } from '@/lib/tmdb/types';
import { createTmdbTask, runInWorker, ensureSettingsLoaded } from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    // Ensure task queue settings are loaded from DB
    await ensureSettingsLoaded();

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

    // Create task tracker with custom title for the specific show
    const tracker = createTmdbTask('tmdb-import', `Import: ${show.title}`);
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
