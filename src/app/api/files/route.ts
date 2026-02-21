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
import { FileQuality, Action, PlaybackStatus } from '@/generated/prisma/client';
import { checkAuth } from '@/lib/auth';

/** Compute an overall playback status from per-platform latest results.
 *  Mixed PASS/FAIL across platforms → PARTIAL (computed, never stored on tests). */
function computeOverallStatus(
  platformTests: Record<string, { status: PlaybackStatus }>
): PlaybackStatus | null {
  const statuses = Object.values(platformTests).map((t) => t.status);
  if (statuses.length === 0) return null;
  const hasFail = statuses.some((s) => s === 'FAIL');
  const hasPass = statuses.some((s) => s === 'PASS');
  if (hasFail && hasPass) return 'PARTIAL';
  if (hasFail) return 'FAIL';
  return 'PASS';
}

const VALID_QUALITIES: FileQuality[] = ['UNVERIFIED', 'VERIFIED', 'OK', 'BROKEN'];
const VALID_ACTIONS: Action[] = ['NOTHING', 'REDOWNLOAD', 'CONVERT', 'ORGANIZE', 'REPAIR'];
const VALID_PLAYBACK: PlaybackStatus[] = ['PASS', 'PARTIAL', 'FAIL'];

/**
 * Pre-compute file IDs matching a playback status filter.
 * Fetches all playback tests (lightweight — manually created, small dataset),
 * groups by file → latest test per platform, computes overall status, returns matching IDs.
 */
async function getFileIdsByPlaybackStatus(
  status: PlaybackStatus
): Promise<number[]> {
  const tests = await prisma.playbackTest.findMany({
    orderBy: { testedAt: 'desc' },
    select: { episodeFileId: true, platformId: true, status: true },
  });

  const fileTestMap = new Map<number, Record<string, { status: PlaybackStatus }>>();
  for (const t of tests) {
    if (!t.episodeFileId) continue;
    const key = String(t.platformId);
    if (!fileTestMap.has(t.episodeFileId)) {
      fileTestMap.set(t.episodeFileId, {});
    }
    const ft = fileTestMap.get(t.episodeFileId)!;
    if (!(key in ft)) ft[key] = { status: t.status };
  }

  const ids: number[] = [];
  for (const [fileId, platformTests] of fileTestMap) {
    if (computeOverallStatus(platformTests) === status) ids.push(fileId);
  }
  return ids;
}

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
    const playback = searchParams.get('playback');

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

    // Playback status filter — requires pre-computation since it's derived from related tests
    if (playback === 'untested') {
      where.playbackTests = { none: {} };
    } else if (playback && VALID_PLAYBACK.includes(playback as PlaybackStatus)) {
      const matchingIds = await getFileIdsByPlaybackStatus(playback as PlaybackStatus);
      where.id = { in: matchingIds };
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

    // Batch queries for related data
    const fileIds = files.map((f) => f.id);
    const episodeIds = [...new Set(files.map((f) => f.episodeId))];

    const [issueCounts, allTests, platforms] = await Promise.all([
      episodeIds.length > 0
        ? prisma.issue.groupBy({
            by: ['episodeId'],
            where: { episodeId: { in: episodeIds } },
            _count: true,
          })
        : [],
      fileIds.length > 0
        ? prisma.playbackTest.findMany({
            where: { episodeFileId: { in: fileIds } },
            orderBy: { testedAt: 'desc' },
            select: { id: true, episodeFileId: true, platformId: true, status: true, notes: true },
          })
        : [],
      prisma.platform.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, isRequired: true, sortOrder: true },
      }),
    ]);

    const issueCountMap = new Map(
      issueCounts.map((ic) => [ic.episodeId, ic._count])
    );

    // Build per-file test map: fileId -> { platformId -> { id, status, notes } }
    // Tests are ordered by testedAt desc, so first occurrence per platform is latest
    const testMap = new Map<number, Record<string, { id: number; status: PlaybackStatus; notes: string | null }>>();
    for (const test of allTests) {
      if (!test.episodeFileId) continue;
      const key = String(test.platformId);
      if (!testMap.has(test.episodeFileId)) {
        testMap.set(test.episodeFileId, {});
      }
      const fileTests = testMap.get(test.episodeFileId)!;
      if (!(key in fileTests)) {
        fileTests[key] = { id: test.id, status: test.status, notes: test.notes };
      }
    }

    // Serialize response with BigInt conversion and merged counts
    const result = files.map((file) => {
      const playbackTests = testMap.get(file.id) ?? {};
      return {
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
        playbackTests,
        overallPlaybackStatus: computeOverallStatus(playbackTests),
        // [MOVIES FUTURE] Add movieFile support when movies are implemented
      };
    });

    return NextResponse.json({ data: result, total: totalCount, platforms });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
