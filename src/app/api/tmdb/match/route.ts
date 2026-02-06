/**
 * TMDB match API route
 * POST /api/tmdb/match - Match a local show to a TMDB show
 */

import { NextResponse } from 'next/server';
import { matchShow, unmatchShow, TMDBError, isTmdbConfigured } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';

interface MatchRequest {
  showId: number;
  tmdbId: number | null; // null to unmatch
  syncSeasons?: boolean;
}

export async function POST(request: Request) {
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
