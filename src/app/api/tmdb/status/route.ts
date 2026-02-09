/**
 * TMDB integration status API route
 * GET /api/tmdb/status - Get integration health and sync statistics
 *
 * @swagger
 * /api/tmdb/status:
 *   get:
 *     summary: Get TMDB integration status
 *     description: Returns the current TMDB integration configuration status and sync statistics.
 *     tags: [TMDB]
 *     responses:
 *       200:
 *         description: Integration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 hasApiKey:
 *                   type: boolean
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { getEnhancedIntegrationStatus, isTmdbConfigured } from '@/lib/tmdb';

export async function GET() {
  const configured = isTmdbConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      shows: { total: 0, matched: 0, unmatched: 0, needsSync: 0, fullySynced: 0 },
      seasons: { total: 0, withMetadata: 0 },
      episodes: { total: 0, withMetadata: 0 },
      lastSyncedShow: null,
    });
  }

  try {
    const status = await getEnhancedIntegrationStatus();

    return NextResponse.json({
      ...status,
      configured: true,
    });
  } catch (error) {
    console.error('TMDB status error:', error);
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}
