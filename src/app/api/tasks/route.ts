/**
 * Tasks API route
 * GET /api/tasks - List all active tasks
 *
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List active tasks
 *     description: Returns all active and recently completed background tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Task list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       taskId:
 *                         type: string
 *                       type:
 *                         type: string
 *                       status:
 *                         $ref: '#/components/schemas/TaskStatus'
 *                       title:
 *                         type: string
 *                         nullable: true
 *                       progress:
 *                         type: object
 *                 count:
 *                   type: integer
 */

import { NextResponse } from 'next/server';
import { getActiveTasks } from '@/lib/tasks';

export async function GET() {
  const tasks = getActiveTasks();

  return NextResponse.json({
    tasks,
    count: tasks.length,
  });
}
