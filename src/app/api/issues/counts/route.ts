/**
 * Issue Counts API
 * GET: Returns issue counts by status (for sidebar badge)
 *
 * @swagger
 * /api/issues/counts:
 *   get:
 *     summary: Get issue counts by status
 *     description: Returns issue counts grouped by status, plus computed active and total counts.
 *     tags: [Issues]
 *     responses:
 *       200:
 *         description: Issue counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 open:
 *                   type: integer
 *                 acknowledged:
 *                   type: integer
 *                 inProgress:
 *                   type: integer
 *                 resolved:
 *                   type: integer
 *                 closed:
 *                   type: integer
 *                 active:
 *                   type: integer
 *                   description: Sum of open, acknowledged, and in-progress
 *                 total:
 *                   type: integer
 *                   description: Sum of all statuses
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const groups = await prisma.issue.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const countMap: Record<string, number> = {};
    for (const g of groups) {
      countMap[g.status] = g._count.status;
    }

    const open = countMap['OPEN'] || 0;
    const acknowledged = countMap['ACKNOWLEDGED'] || 0;
    const inProgress = countMap['IN_PROGRESS'] || 0;
    const resolved = countMap['RESOLVED'] || 0;
    const closed = countMap['CLOSED'] || 0;

    return NextResponse.json({
      open,
      acknowledged,
      inProgress,
      resolved,
      closed,
      active: open + acknowledged + inProgress,
      total: open + acknowledged + inProgress + resolved + closed,
    });
  } catch (error) {
    console.error('Failed to fetch issue counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issue counts' },
      { status: 500 }
    );
  }
}
