/**
 * POST /api/scan - Start a new scan
 * GET /api/scan - List recent scans
 *
 * @swagger
 * /api/scan:
 *   get:
 *     summary: List scan history
 *     description: Returns a list of recent scan records
 *     tags: [Scanner]
 *     responses:
 *       200:
 *         description: Scan history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scans:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Start a new library scan
 *     description: Initiates a full or quick scan of the media library
 *     tags: [Scanner]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scanType:
 *                 type: string
 *                 enum: [full, quick]
 *                 default: full
 *               skipMetadata:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Scan started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scanId:
 *                   type: integer
 *                 taskId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Scan already running
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server';
import { startScan, getRecentScans } from '@/lib/scanner';
import { checkAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));

    const { scanId, taskId } = await startScan({
      scanType: body.scanType ?? 'full',
      skipMetadata: body.skipMetadata ?? true, // Skip ffprobe for now
      concurrency: body.concurrency ?? 4,
    });

    return NextResponse.json({
      scanId,
      taskId,
      status: 'started',
      message: 'Scan started successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start scan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scans = await getRecentScans(20);
    return NextResponse.json(scans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
