/**
 * Files List API
 * GET: List all files with episode/season/show context
 *
 * @swagger
 * /api/files:
 *   get:
 *     summary: List all episode files
 *     description: Returns episode files with episode, season, and show context, plus playback test and issue counts. Supports filtering and offset-based pagination.
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by filename
 *       - in: query
 *         name: quality
 *         schema:
 *           $ref: '#/components/schemas/FileQuality'
 *         description: Filter by quality status
 *       - in: query
 *         name: action
 *         schema:
 *           $ref: '#/components/schemas/Action'
 *         description: Filter by recommended action
 *       - in: query
 *         name: fileExists
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by file existence on disk
 *       - in: query
 *         name: analyzed
 *         schema:
 *           type: string
 *           enum: [yes, no]
 *         description: Filter by whether FFprobe analysis has been run
 *       - in: query
 *         name: codec
 *         schema:
 *           type: string
 *         description: Filter by video codec (exact match)
 *       - in: query
 *         name: hdr
 *         schema:
 *           type: string
 *           enum: [yes, no]
 *         description: Filter by HDR content
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *           minimum: 1
 *           maximum: 500
 *         description: Number of files to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of files to skip for pagination
 *     responses:
 *       200:
 *         description: Paginated files with total count
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
 *                   description: Total number of files matching filters
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FileQuality, Action } from '@/generated/prisma/client';
import { checkAuth } from '@/lib/auth';

const VALID_QUALITIES: FileQuality[] = ['UNVERIFIED', 'VERIFIED', 'OK', 'BROKEN'];
const VALID_ACTIONS: Action[] = ['NOTHING', 'REDOWNLOAD', 'CONVERT', 'ORGANIZE', 'REPAIR'];

export async function GET(request: Request) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const quality = searchParams.get('quality');
    const action = searchParams.get('action');
    const fileExists = searchParams.get('fileExists');
    const analyzed = searchParams.get('analyzed');
    const codec = searchParams.get('codec');
    const hdr = searchParams.get('hdr');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (q) {
      where.filename = { contains: q };
    }

    if (quality && VALID_QUALITIES.includes(quality as FileQuality)) {
      where.quality = quality;
    }

    if (action && VALID_ACTIONS.includes(action as Action)) {
      where.action = action;
    }

    if (fileExists === 'true') {
      where.fileExists = true;
    } else if (fileExists === 'false') {
      where.fileExists = false;
    }

    if (analyzed === 'yes') {
      where.mediaInfoExtractedAt = { not: null };
    } else if (analyzed === 'no') {
      where.mediaInfoExtractedAt = null;
    }

    if (codec) {
      where.codec = codec;
    }

    if (hdr === 'yes') {
      where.hdrType = { not: null };
    } else if (hdr === 'no') {
      where.hdrType = null;
    }

    // Pagination
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '200', 10) || 200, 1), 500);
    const offset = Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0);

    const [files, totalCount] = await Promise.all([
      prisma.episodeFile.findMany({
        where,
        orderBy: { dateModified: 'desc' },
        skip: offset,
        take: limit,
        include: {
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
          _count: {
            select: { playbackTests: true },
          },
        },
      }),
      prisma.episodeFile.count({ where }),
    ]);

    // Get issue counts per episode (issues are on episodes, not files)
    const episodeIds = [...new Set(files.map((f) => f.episodeId))];
    const issueCounts = episodeIds.length > 0
      ? await prisma.issue.groupBy({
          by: ['episodeId'],
          where: { episodeId: { in: episodeIds } },
          _count: true,
        })
      : [];
    const issueCountMap = new Map(
      issueCounts.map((ic) => [ic.episodeId, ic._count])
    );

    // Serialize response with BigInt conversion and merged counts
    const result = files.map((file) => ({
      id: file.id,
      episodeId: file.episodeId,
      filepath: file.filepath,
      filename: file.filename,
      fileSize: file.fileSize.toString(),
      dateModified: file.dateModified.toISOString(),
      fileExists: file.fileExists,
      quality: file.quality,
      action: file.action,
      notes: file.notes,
      codec: file.codec,
      resolution: file.resolution,
      bitrate: file.bitrate,
      container: file.container,
      audioFormat: file.audioFormat,
      hdrType: file.hdrType,
      duration: file.duration,
      mediaInfoExtractedAt: file.mediaInfoExtractedAt?.toISOString() ?? null,
      mediaInfoError: file.mediaInfoError,
      plexMatched: file.plexMatched,
      episode: file.episode,
      testCount: file._count.playbackTests,
      issueCount: issueCountMap.get(file.episodeId) ?? 0,
      // [MOVIES FUTURE] Add movieFile support when movies are implemented
    }));

    return NextResponse.json({ data: result, total: totalCount });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
