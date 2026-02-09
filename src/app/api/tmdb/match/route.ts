/**
 * TMDB match API route
 * POST /api/tmdb/match - Match a local show to a TMDB show
 *
 * @swagger
 * /api/tmdb/match:
 *   post:
 *     summary: Match a show to a TMDB ID
 *     description: Links a local TV show to a TMDB entry by ID, or unmatches it by passing null.
 *     tags: [TMDB]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [showId, tmdbId]
 *             properties:
 *               showId:
 *                 type: integer
 *                 description: Local show ID
 *               tmdbId:
 *                 type: integer
 *                 nullable: true
 *                 description: TMDB show ID, or null to unmatch
 *               syncSeasons:
 *                 type: boolean
 *                 description: Whether to immediately sync season metadata
 *     responses:
 *       200:
 *         description: Show matched or unmatched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 show:
 *                   type: object
 *       400:
 *         description: Missing or invalid parameters
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
 *         description: Show not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: TMDB not configured
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
import { matchShow, unmatchShow, TMDBError, isTmdbConfigured } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/auth';

interface MatchRequest {
  showId: number;
  tmdbId: number | null; // null to unmatch
  syncSeasons?: boolean;
}

export async function POST(request: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  let body: MatchRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // syncSeasons defaults to false - caller should explicitly opt-in
  // The match dialog passes syncSeasons: true for immediate sync
  const { showId, tmdbId, syncSeasons = false } = body;

  if (typeof showId !== 'number') {
    return NextResponse.json(
      { error: 'showId is required and must be a number' },
      { status: 400 }
    );
  }

  // Verify show exists
  const show = await prisma.tVShow.findUnique({
    where: { id: showId },
  });

  if (!show) {
    return NextResponse.json(
      { error: 'Show not found' },
      { status: 404 }
    );
  }

  try {
    if (tmdbId === null) {
      // Unmatch
      await unmatchShow(showId);
      return NextResponse.json({
        success: true,
        message: 'Show unmatched from TMDB',
      });
    }

    if (typeof tmdbId !== 'number') {
      return NextResponse.json(
        { error: 'tmdbId must be a number or null' },
        { status: 400 }
      );
    }

    // Match and sync
    await matchShow(showId, tmdbId, syncSeasons);

    // Return updated show
    const updatedShow = await prisma.tVShow.findUnique({
      where: { id: showId },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        posterPath: true,
        description: true,
        lastMetadataSync: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Show matched to TMDB',
      show: updatedShow,
    });
  } catch (error) {
    if (error instanceof TMDBError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('TMDB match error:', error);
    return NextResponse.json(
      { error: 'Failed to match show' },
      { status: 500 }
    );
  }
}
