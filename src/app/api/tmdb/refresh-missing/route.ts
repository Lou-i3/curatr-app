/**
 * TMDB Refresh Missing Metadata API
 * POST /api/tmdb/refresh-missing - Sync seasons/episodes for shows that need it
 */

import { NextResponse } from 'next/server';
import { isTmdbConfigured, getShowsNeedingSync, syncShowSeasons } from '@/lib/tmdb';

interface RefreshResult {
  showId: number;
  title: string;
  success: boolean;
  error?: string;
}

export async function POST() {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB is not configured' },
      { status: 400 }
    );
  }

  try {
    const showsNeedingSync = await getShowsNeedingSync();

    if (showsNeedingSync.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        total: 0,
        results: [],
        message: 'All shows are already synced',
      });
    }

    const results: RefreshResult[] = [];
    let synced = 0;
    let failed = 0;

    for (const show of showsNeedingSync) {
      try {
        await syncShowSeasons(show.id, show.tmdbId);
        results.push({
          showId: show.id,
          title: show.title,
          success: true,
        });
        synced++;
      } catch (error) {
        results.push({
          showId: show.id,
          title: show.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: showsNeedingSync.length,
      results,
    });
  } catch (error) {
    console.error('TMDB refresh missing error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh missing metadata' },
      { status: 500 }
    );
  }
}
