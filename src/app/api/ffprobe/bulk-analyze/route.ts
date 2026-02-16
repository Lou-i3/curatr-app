/**
 * Bulk FFprobe analysis API
 * POST /api/ffprobe/bulk-analyze - Analyze multiple files with FFprobe
 *
 * @swagger
 * /api/ffprobe/bulk-analyze:
 *   post:
 *     summary: Bulk analyze files with FFprobe
 *     description: >
 *       Starts a background task that runs FFprobe analysis on unanalyzed files.
 *       Scope can be a single season, a show, or the entire library.
 *     tags: [FFprobe]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scope]
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [show, season, library]
 *               showId:
 *                 type: integer
 *                 description: Required for show and season scope
 *               seasonId:
 *                 type: integer
 *                 description: Required for season scope
 *               reanalyze:
 *                 type: boolean
 *                 default: false
 *                 description: If true, re-analyze all files including previously analyzed ones
 *     responses:
 *       200:
 *         description: Bulk analysis started, queued, or no files to analyze
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
 *         description: Invalid scope or missing parameters
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
 *       503:
 *         description: FFprobe not configured
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
import { analyzeAndSaveMediaInfo, isFFprobeAvailable } from '@/lib/ffprobe';
import {
  createBulkFfprobeTask,
  scheduleCleanup,
  queueTaskRun,
  isCancelled,
  yieldToEventLoop,
  ensureSettingsLoaded,
} from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    // Check FFprobe availability
    if (!(await isFFprobeAvailable())) {
      return NextResponse.json(
        {
          error: 'FFprobe is not configured. Set FFPROBE_PATH environment variable.',
          code: 'FFPROBE_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { scope, showId, seasonId, reanalyze = false } = body;

    if (!scope || !['show', 'season', 'library'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be "show", "season", or "library".' },
        { status: 400 }
      );
    }

    if ((scope === 'show' || scope === 'season') && !showId) {
      return NextResponse.json(
        { error: 'showId is required for show and season scope.' },
        { status: 400 }
      );
    }

    if (scope === 'season' && !seasonId) {
      return NextResponse.json(
        { error: 'seasonId is required for season scope.' },
        { status: 400 }
      );
    }

    await ensureSettingsLoaded();

    // Build where clause — only unanalyzed files unless reanalyze is set
    const whereClause: Record<string, unknown> = {
      fileExists: true,
      ...(reanalyze ? {} : { mediaInfoExtractedAt: null }),
    };

    if (scope === 'season') {
      whereClause.episode = { seasonId: seasonId };
    } else if (scope === 'show') {
      whereClause.episode = { season: { tvShowId: showId } };
    }

    // Query files to analyze
    const files = await prisma.episodeFile.findMany({
      where: whereClause,
      select: { id: true, filename: true },
      orderBy: { id: 'asc' },
    });

    if (files.length === 0) {
      return NextResponse.json({
        taskId: null,
        total: 0,
        message: reanalyze ? 'No files found' : 'All files already analyzed',
      });
    }

    // Build task title based on scope
    let title: string | undefined;
    if (scope === 'show') {
      const show = await prisma.tVShow.findUnique({
        where: { id: showId },
        select: { title: true },
      });
      title = `FFprobe: ${show?.title || 'Unknown Show'}`;
    } else if (scope === 'season') {
      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        select: {
          seasonNumber: true,
          tvShow: { select: { title: true } },
        },
      });
      if (season) {
        title = `FFprobe: ${season.tvShow.title} S${String(season.seasonNumber).padStart(2, '0')}`;
      }
    }
    // Library scope: no title (convention for bulk operations)

    // Create task tracker
    const tracker = createBulkFfprobeTask(title);
    tracker.setTotal(files.length);

    // Define the analysis loop
    const runAnalysis = async (): Promise<void> => {
      for (const file of files) {
        if (isCancelled(tracker.getTaskId())) {
          tracker.cancel();
          return;
        }
        tracker.setCurrentItem(file.filename);
        try {
          await analyzeAndSaveMediaInfo(file.id);
          tracker.incrementSuccess(file.filename);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Analysis failed';
          tracker.incrementFailed(file.filename, message);
        }
        await yieldToEventLoop();
      }
      tracker.complete();
    };

    const status = tracker.getProgress().status;
    scheduleCleanup(tracker.getTaskId());

    if (status === 'pending') {
      queueTaskRun(tracker.getTaskId(), runAnalysis);
      return NextResponse.json({
        taskId: tracker.getTaskId(),
        status: 'pending',
        total: files.length,
        message: `Analysis queued for ${files.length} files`,
      });
    } else {
      // Run in background (fire-and-forget)
      runAnalysis().catch((err) => {
        tracker.fail(err instanceof Error ? err.message : 'Bulk analysis failed');
      });

      return NextResponse.json({
        taskId: tracker.getTaskId(),
        status: 'running',
        total: files.length,
        message: `Analyzing ${files.length} files...`,
      });
    }
  } catch (error) {
    console.error('Bulk FFprobe analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk analysis' },
      { status: 500 }
    );
  }
}
