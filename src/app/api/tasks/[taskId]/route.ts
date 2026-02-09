/**
 * Task status API route
 * GET /api/tasks/[taskId] - Get status of a specific task
 *
 * @swagger
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get task status
 *     description: Returns the current status and progress of a specific task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskId:
 *                   type: string
 *                 type:
 *                   type: string
 *                 status:
 *                   $ref: '#/components/schemas/TaskStatus'
 *                 title:
 *                   type: string
 *                   nullable: true
 *                 progress:
 *                   type: object
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskTracker } from '@/lib/tasks';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { taskId } = await params;

  const tracker = getTaskTracker(taskId);

  if (!tracker) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(tracker.getSerialized());
}
