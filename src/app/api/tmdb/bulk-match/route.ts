/**
 * TMDB bulk match API route
 * POST /api/tmdb/bulk-match - Start auto-matching unmatched shows
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoMatchShow, matchShow, isTmdbConfigured } from '@/lib/tmdb';

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  try {
    // Get all unmatched shows
    const unmatchedShows = await prisma.tVShow.findMany({
      where: { tmdbId: null },
      select: { id: true, title: true, year: true },
    });

    if (unmatchedShows.length === 0) {
      return NextResponse.json({
        success: true,
        matched: 0,
        skipped: 0,
        total: 0,
        results: [],
      });
    }

    const results: {
      showId: number;
      title: string;
      status: 'matched' | 'skipped' | 'error';
      tmdbId?: number;
      tmdbTitle?: string;
      confidence?: number;
      error?: string;
    }[] = [];

    let matched = 0;
    let skipped = 0;

    for (const show of unmatchedShows) {
      try {
        const match = await autoMatchShow(show.title, show.year ?? undefined);

        if (match) {
          // High confidence match - apply it
          await matchShow(show.id, match.tmdbShow.id, true);
          matched++;
          results.push({
            showId: show.id,
            title: show.title,
            status: 'matched',
            tmdbId: match.tmdbShow.id,
            tmdbTitle: match.tmdbShow.name,
            confidence: match.confidence,
          });
        } else {
          // No confident match found
          skipped++;
          results.push({
            showId: show.id,
            title: show.title,
            status: 'skipped',
          });
        }
      } catch (error) {
        skipped++;
        results.push({
          showId: show.id,
          title: show.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      matched,
      skipped,
      total: unmatchedShows.length,
      results,
    });
  } catch (error) {
    console.error('Bulk match error:', error);
    return NextResponse.json(
      { error: 'Failed to run bulk match' },
      { status: 500 }
    );
  }
}
