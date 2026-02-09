/**
 * POST /api/scan/[id]/cancel - Cancel a running scan
 *
 * @swagger
 * /api/scan/{id}/cancel:
 *   post:
 *     summary: Cancel a running scan
 *     description: Requests cancellation of a currently running scan
 *     tags: [Scanner]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 scanId:
 *                   type: integer
 *       400:
 *         description: Scan is not running
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
import { cancelScan, isScanActive } from '@/lib/scanner';
import { checkAdmin } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const { id } = await params;
  const scanId = parseInt(id, 10);

  if (isNaN(scanId)) {
    return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
  }

  if (!isScanActive(scanId)) {
    return NextResponse.json(
      { error: 'Scan is not running or does not exist' },
      { status: 404 }
    );
  }

  const cancelled = cancelScan(scanId);

  if (cancelled) {
    return NextResponse.json({ status: 'cancelled', scanId });
  } else {
    return NextResponse.json(
      { error: 'Failed to cancel scan' },
      { status: 500 }
    );
  }
}
