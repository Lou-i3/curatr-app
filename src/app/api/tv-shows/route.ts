import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MonitorStatus } from '@/generated/prisma/client';

type TmdbStatus = 'all' | 'unmatched' | 'needs-sync' | 'fully-synced';

/**
 * GET /api/tv-shows - List TV shows with optional filters
 * Query params:
 * - unmatched: "true" to filter shows without TMDB match (legacy, prefer tmdbStatus)
 * - tmdbStatus: "all" | "unmatched" | "needs-sync" | "fully-synced"
 * - includeStats: "true" to include season/episode sync counts
 * - limit: number of results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unmatched = searchParams.get('unmatched') === 'true';
    const tmdbStatus = (searchParams.get('tmdbStatus') as TmdbStatus) || 'all';
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause based on tmdbStatus
    let where: Record<string, unknown> = {};

    // Legacy support for unmatched param
    if (unmatched) {
      where = { tmdbId: null };
    } else {
      switch (tmdbStatus) {
        case 'unmatched':
          where = { tmdbId: null };
          break;
        case 'needs-sync':
          where = {
            tmdbId: { not: null },
            OR: [
              { seasons: { some: { tmdbSeasonId: null } } },
              { seasons: { some: { episodes: { some: { tmdbEpisodeId: null } } } } },
            ],
          };
          break;
        case 'fully-synced':
          // Shows that are matched AND have no seasons without tmdbSeasonId
          // AND no episodes without tmdbEpisodeId
          // This is tricky - we need to filter out shows that have any unsynced children
          where = {
            tmdbId: { not: null },
            NOT: {
              OR: [
                { seasons: { some: { tmdbSeasonId: null } } },
                { seasons: { some: { episodes: { some: { tmdbEpisodeId: null } } } } },
              ],
            },
          };
          break;
        default:
          // 'all' - no filter
          break;
      }
    }

    // If includeStats, we need to fetch with season/episode counts
    if (includeStats) {
      const shows = await prisma.tVShow.findMany({
        where,
        take: limit,
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          year: true,
          tmdbId: true,
          posterPath: true,
          monitorStatus: true,
          seasons: {
            select: {
              id: true,
              tmdbSeasonId: true,
              episodes: {
                select: {
                  id: true,
                  tmdbEpisodeId: true,
                },
              },
            },
          },
        },
      });

      // Transform to include computed stats
      const showsWithStats = shows.map((show) => {
        const seasonCount = show.seasons.length;
        const seasonsWithMetadata = show.seasons.filter((s) => s.tmdbSeasonId !== null).length;
        const episodeCount = show.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
        const episodesWithMetadata = show.seasons.reduce(
          (acc, s) => acc + s.episodes.filter((e) => e.tmdbEpisodeId !== null).length,
          0
        );

        // Determine sync status
        let syncStatus: 'unmatched' | 'needs-sync' | 'fully-synced';
        if (!show.tmdbId) {
          syncStatus = 'unmatched';
        } else if (
          seasonCount > 0 &&
          seasonsWithMetadata === seasonCount &&
          episodeCount > 0 &&
          episodesWithMetadata === episodeCount
        ) {
          syncStatus = 'fully-synced';
        } else if (show.tmdbId) {
          // Matched but not all synced (or no seasons/episodes yet)
          syncStatus = seasonCount === 0 ? 'fully-synced' : 'needs-sync';
        } else {
          syncStatus = 'unmatched';
        }

        return {
          id: show.id,
          title: show.title,
          year: show.year,
          tmdbId: show.tmdbId,
          posterPath: show.posterPath,
          monitorStatus: show.monitorStatus,
          seasonCount,
          seasonsWithMetadata,
          episodeCount,
          episodesWithMetadata,
          syncStatus,
        };
      });

      return NextResponse.json({ shows: showsWithStats });
    }

    // Simple query without stats
    const shows = await prisma.tVShow.findMany({
      where,
      take: limit,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true,
        monitorStatus: true,
      },
    });

    return NextResponse.json({ shows });
  } catch (error) {
    console.error('Failed to fetch TV shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TV shows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, year, monitorStatus, notes, description, posterPath, backdropPath } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const show = await prisma.tVShow.create({
      data: {
        title: title.trim(),
        year: year ? parseInt(year, 10) : null,
        monitorStatus: monitorStatus && ['WANTED', 'UNWANTED'].includes(monitorStatus)
          ? (monitorStatus as MonitorStatus)
          : 'WANTED',
        notes: notes || null,
        description: description || null,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
      },
    });

    return NextResponse.json(show, { status: 201 });
  } catch (error) {
    console.error('Failed to create TV show:', error);
    return NextResponse.json(
      { error: 'Failed to create TV show' },
      { status: 500 }
    );
  }
}
