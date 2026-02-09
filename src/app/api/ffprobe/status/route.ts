/**
 * FFprobe integration status API
 * GET /api/ffprobe/status - Get FFprobe availability and analysis statistics
 *
 * @swagger
 * /api/ffprobe/status:
 *   get:
 *     summary: Get FFprobe availability and stats
 *     description: Returns whether FFprobe is available, its configured path, and file analysis statistics.
 *     tags: [FFprobe]
 *     responses:
 *       200:
 *         description: FFprobe status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 path:
 *                   type: string
 *                   nullable: true
 *                 analyzedFiles:
 *                   type: integer
 *                 totalFiles:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { getFFprobeStatus } from '@/lib/ffprobe';

export async function GET() {
  try {
    const status = await getFFprobeStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('FFprobe status error:', error);
    return NextResponse.json(
      { error: 'Failed to get FFprobe status' },
      { status: 500 }
    );
  }
}
