import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MonitorStatus, FileQuality } from '@/generated/prisma/client';
import {
  computeEpisodeQuality,
  computeSeasonQuality,
  computeShowQuality,
  getDisplayMonitorStatus,
  type QualityStatus,
  type DisplayMonitorStatus,
} from '@/lib/status';
import { checkAdmin, checkAuth } from '@/lib/auth';

type TmdbStatus = 'all' | 'unmatched' | 'needs-sync' | 'fully-synced';

export interface TVShowListItem {
  id: number;
  title: string;
  year: number | null;
  description: string | null;
  notes: string | null;
  posterPath: string | null;
  tmdbId: number | null;
  voteAverage: number | null;
  monitorStatus: MonitorStatus;
  displayMonitorStatus: DisplayMonitorStatus;
  qualityStatus: QualityStatus;
  seasonCount: number;
  episodeCount: number;
  fileCount: number;
  totalSize: string; // BigInt serialized as string
}

/**
 * @swagger
 * /api/tv-shows:
 *   get:
 *     summary: List TV shows
 *     description: List TV shows with optional filters for search, monitor status, TMDB sync status, and quality stats
 *     tags: [TV Shows]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term for title
 *       - in: query
 *         name: monitor
 *         schema:
 *           type: string
 *           enum: [WANTED, UNWANTED, all]
 *         description: Filter by monitor status
 *       - in: query
 *         name: full
 *         schema:
 *           type: string
 *           enum: ['true']
 *         description: Include quality status and file stats (for list view)
 *       - in: query
 *         name: tmdbStatus
 *         schema:
 *           type: string
 *           enum: [all, unmatched, needs-sync, fully-synced]
 *         description: Filter by TMDB sync status
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: string
 *           enum: ['true']
 *         description: Include season/episode sync counts
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of results
 *     responses:
 *       200:
 *         description: TV show list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shows:
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
 *     summary: Create a TV show
 *     tags: [TV Shows]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               year:
 *                 type: integer
 *                 nullable: true
 *               monitorStatus:
 *                 $ref: '#/components/schemas/MonitorStatus'
 *               notes:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               posterPath:
 *                 type: string
 *                 nullable: true
 *               backdropPath:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Created TV show
 *       400:
 *         description: Validation error
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
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const monitor = searchParams.get('monitor');
    const full = searchParams.get('full') === 'true';
    const unmatched = searchParams.get('unmatched') === 'true';
    const tmdbStatus = (searchParams.get('tmdbStatus') as TmdbStatus) || 'all';
    const includeStats = searchParams.get('includeStats') === 'true';
    const defaultLimit = full ? 9999 : 50;
    const limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

    // Full query for list view with quality status and file stats
    if (full) {
      const where = {
        ...(q ? { title: { contains: q } } : {}),
        ...(monitor && monitor !== 'all' ? { monitorStatus: monitor as MonitorStatus } : {}),
      };

      const shows = await prisma.tVShow.findMany({
        where,
        take: limit,
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          year: true,
          description: true,
          notes: true,
          posterPath: true,
          tmdbId: true,
          voteAverage: true,
          monitorStatus: true,
          seasons: {
            select: {
              monitorStatus: true,
              episodes: {
                select: {
                  monitorStatus: true,
                  files: {
                    select: {
                      quality: true,
                      fileSize: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const items: TVShowListItem[] = shows.map((show) => {
        let fileCount = 0;
        let totalSize = BigInt(0);

        const seasonsWithQuality = show.seasons.map((season) => {
          const episodesWithQuality = season.episodes.map((episode) => {
            fileCount += episode.files.length;
            for (const file of episode.files) {
              totalSize += file.fileSize;
            }
            return {
              qualityStatus: computeEpisodeQuality(
                episode.monitorStatus,
                episode.files as { quality: FileQuality }[]
              ),
            };
          });
          return {
            monitorStatus: season.monitorStatus,
            qualityStatus: computeSeasonQuality(episodesWithQuality),
          };
        });

        const displayMonitorStatus = getDisplayMonitorStatus(show.monitorStatus, show.seasons);
        const qualityStatus = computeShowQuality(seasonsWithQuality);
        const episodeCount = show.seasons.reduce((acc, s) => acc + s.episodes.length, 0);

        return {
          id: show.id,
          title: show.title,
          year: show.year,
          description: show.description,
          notes: show.notes,
          posterPath: show.posterPath,
          tmdbId: show.tmdbId,
          voteAverage: show.voteAverage,
          monitorStatus: show.monitorStatus,
          displayMonitorStatus,
          qualityStatus,
          seasonCount: show.seasons.length,
          episodeCount,
          fileCount,
          totalSize: totalSize.toString(),
        };
      });

      return NextResponse.json({ shows: items, count: items.length });
    }

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
    const authError = await checkAdmin();
    if (authError) return authError;

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
