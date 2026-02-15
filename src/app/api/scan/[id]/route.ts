/**
 * GET /api/scan/[id] - Get scan status/details
 *
 * @swagger
 * /api/scan/{id}:
 *   get:
 *     summary: Get scan status and details
 *     description: Returns the current status and details for a specific scan
 *     tags: [Scanner]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid scan ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Scan not found
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
import { getScanHistory, getScanProgress, isScanActive } from '@/lib/scanner';
import { checkAuth } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await checkAuth();
  if (authError) return authError;

  const { id } = await params;
  const scanId = parseInt(id, 10);

  if (isNaN(scanId)) {
    return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
  }

  // Check if scan is currently running
  const isRunning = isScanActive(scanId);

  if (isRunning) {
    const tracker = getScanProgress(scanId);
    if (tracker) {
      return NextResponse.json({
        ...tracker.getProgress(),
        isRunning: true,
      });
    }
  }

  // Get from database
  const scan = await getScanHistory(scanId);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...scan,
    isRunning: false,
    errors: scan.errors ? JSON.parse(scan.errors) : [],
  });
}
