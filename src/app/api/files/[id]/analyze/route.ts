/**
 * File media analysis API
 * POST /api/files/[id]/analyze - Analyze file with FFprobe and store results
 *
 * @swagger
 * /api/files/{id}/analyze:
 *   post:
 *     summary: Analyze file with FFprobe
 *     description: >
 *       Runs FFprobe analysis on the file and stores media track information.
 *       The file must exist on disk and FFprobe must be configured via FFPROBE_PATH.
 *     tags: [FFprobe]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: Analysis completed or queued
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Task queued
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: pending
 *                     message:
 *                       type: string
 *                 - type: object
 *                   description: Completed immediately
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: completed
 *                     summary:
 *                       type: string
 *                     trackCount:
 *                       type: integer
 *       400:
 *         description: Validation error or file no longer exists on disk
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
 *         description: File not found
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
 *       503:
 *         description: FFprobe not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeAndSaveMediaInfo, isFFprobeAvailable } from '@/lib/ffprobe';
import {
  createFfprobeTask,
  scheduleCleanup,
  queueTaskRun,
} from '@/lib/tasks';
import { checkAdmin } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    // Check if file exists
    const file = await prisma.episodeFile.findUnique({
      where: { id: fileId },
      select: { id: true, filename: true, fileExists: true },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!file.fileExists) {
      return NextResponse.json(
        { error: 'File no longer exists on disk' },
        { status: 400 }
      );
    }

    // Check if FFprobe is available
    if (!(await isFFprobeAvailable())) {
      return NextResponse.json(
        {
          error: 'FFprobe is not configured. Set FFPROBE_PATH environment variable.',
          code: 'FFPROBE_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // Create task for tracking
    const tracker = createFfprobeTask(fileId, file.filename);

    // Run the analysis (returns void for queue compatibility)
    const runAnalysis = async (): Promise<void> => {
      try {
        await analyzeAndSaveMediaInfo(fileId);
        tracker.incrementSuccess();
        tracker.complete();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Analysis failed';
        tracker.incrementFailed(file.filename, message);
        tracker.fail(message);
      }
    };

    const status = tracker.getProgress().status;
    if (status === 'pending') {
      // Queue the task
      queueTaskRun(tracker.getTaskId(), runAnalysis);
      scheduleCleanup(tracker.getTaskId());

      return NextResponse.json({
        taskId: tracker.getTaskId(),
        status: 'pending',
        message: 'Analysis queued',
      });
    } else {
      // Run immediately
      scheduleCleanup(tracker.getTaskId());

      try {
        const result = await analyzeAndSaveMediaInfo(fileId);
        tracker.incrementSuccess();
        tracker.complete();

        return NextResponse.json({
          taskId: tracker.getTaskId(),
          status: 'completed',
          summary: result.summary,
          trackCount: result.tracks.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Analysis failed';
        tracker.incrementFailed(file.filename, message);
        tracker.fail(message);

        return NextResponse.json(
          {
            taskId: tracker.getTaskId(),
            status: 'failed',
            error: message,
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Failed to analyze file:', error);
    return NextResponse.json(
      { error: 'Failed to analyze file' },
      { status: 500 }
    );
  }
}
