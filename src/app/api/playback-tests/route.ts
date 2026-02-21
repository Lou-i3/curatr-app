/**
 * Playback Tests API
 * GET: List tests (filter by fileId, platformId, status, search query)
 * POST: Create new test
 *
 * @swagger
 * /api/playback-tests:
 *   get:
 *     summary: List playback tests
 *     description: Returns playback tests with offset-based pagination, optionally filtered by file ID, platform ID, status, or search query. Includes platform and file context, plus status counts for toolbar chips.
 *     tags: [Playback Tests]
 *     parameters:
 *       - in: query
 *         name: fileId
 *         schema:
 *           type: integer
 *         description: Filter by episode file ID
 *       - in: query
 *         name: platformId
 *         schema:
 *           type: integer
 *         description: Filter by platform ID
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/PlaybackStatus'
 *         description: Filter by test status (PASS, PARTIAL, FAIL)
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by show title or filename
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *           minimum: 1
 *           maximum: 500
 *         description: Number of tests to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of tests to skip for pagination
 *     responses:
 *       200:
 *         description: Paginated playback tests with total count and status counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of tests matching all filters
 *                 counts:
 *                   type: object
 *                   description: Status counts across all non-status filters
 *                   properties:
 *                     all:
 *                       type: integer
 *                     PASS:
 *                       type: integer
 *                     PARTIAL:
 *                       type: integer
 *                     FAIL:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a playback test
 *     description: Creates a new playback test for an episode file on a platform. Recomputes file quality after creation.
 *     tags: [Playback Tests]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [episodeFileId, platformId, status]
 *             properties:
 *               episodeFileId:
 *                 type: integer
 *               platformId:
 *                 type: integer
 *               status:
 *                 $ref: '#/components/schemas/PlaybackStatus'
 *               notes:
 *                 type: string
 *               testedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Playback test created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 episodeFileId:
 *                   type: integer
 *                 platformId:
 *                   type: integer
 *                 status:
 *                   $ref: '#/components/schemas/PlaybackStatus'
 *                 notes:
 *                   type: string
 *                   nullable: true
 *                 testedAt:
 *                   type: string
 *                   format: date-time
 *                 platform:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *       400:
 *         description: Missing or invalid required fields
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
 *         description: File or platform not found
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
import { prisma } from '@/lib/prisma';
import { PlaybackStatus } from '@/generated/prisma/client';
import { recomputeFileQuality } from '@/lib/playback-status';
import { checkAuth, checkAdmin } from '@/lib/auth';

const VALID_STATUSES: PlaybackStatus[] = ['PASS', 'FAIL'];

export async function GET(request: Request) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const platformId = searchParams.get('platformId');
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (fileId) {
      const parsedFileId = parseInt(fileId, 10);
      if (!isNaN(parsedFileId)) {
        where.episodeFileId = parsedFileId;
      }
    }

    if (platformId) {
      const parsedPlatformId = parseInt(platformId, 10);
      if (!isNaN(parsedPlatformId)) {
        where.platformId = parsedPlatformId;
      }
    }

    if (status && VALID_STATUSES.includes(status as PlaybackStatus)) {
      where.status = status;
    }

    if (q) {
      where.episodeFile = {
        OR: [
          { filename: { contains: q } },
          { episode: { season: { tvShow: { title: { contains: q } } } } },
        ],
      };
    }

    // Pagination
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '200', 10) || 200, 1), 500);
    const offset = Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0);

    // Build counts where (without status filter so chips show all statuses)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countsWhere: Record<string, any> = { ...where };
    delete countsWhere.status;

    const [tests, totalCount, statusGroups] = await Promise.all([
      prisma.playbackTest.findMany({
        where,
        orderBy: { testedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          platform: true,
          episodeFile: {
            select: {
              id: true,
              filename: true,
              quality: true,
              episode: {
                select: {
                  id: true,
                  episodeNumber: true,
                  title: true,
                  season: {
                    select: {
                      seasonNumber: true,
                      tvShow: { select: { id: true, title: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.playbackTest.count({ where }),
      prisma.playbackTest.groupBy({
        by: ['status'],
        where: countsWhere,
        _count: true,
      }),
    ]);

    // Build status counts
    const counts: Record<string, number> = { all: 0, PASS: 0, FAIL: 0 };
    for (const group of statusGroups) {
      counts[group.status] = group._count;
      counts.all += group._count;
    }

    return NextResponse.json({ data: tests, total: totalCount, counts });
  } catch (error) {
    console.error('Failed to fetch playback tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playback tests' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { episodeFileId, platformId, status, notes, testedAt } = body;

    // Validate required fields
    if (!episodeFileId || typeof episodeFileId !== 'number') {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    if (!platformId || typeof platformId !== 'number') {
      return NextResponse.json(
        { error: 'Platform ID is required' },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (PASS, FAIL)' },
        { status: 400 }
      );
    }

    // Verify file exists
    const file = await prisma.episodeFile.findUnique({
      where: { id: episodeFileId },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Verify platform exists
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
    }

    // Create the test
    const test = await prisma.playbackTest.create({
      data: {
        episodeFileId,
        platformId,
        status,
        notes: notes || null,
        testedAt: testedAt ? new Date(testedAt) : new Date(),
      },
      include: {
        platform: true,
      },
    });

    // Recompute file quality based on tests
    await recomputeFileQuality(episodeFileId);

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Failed to create playback test:', error);
    return NextResponse.json(
      { error: 'Failed to create playback test' },
      { status: 500 }
    );
  }
}
