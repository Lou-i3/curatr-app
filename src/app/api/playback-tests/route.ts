/**
 * Playback Tests API
 * GET: List tests (filter by fileId, platformId)
 * POST: Create new test
 *
 * @swagger
 * /api/playback-tests:
 *   get:
 *     summary: List playback tests
 *     description: Returns playback tests, optionally filtered by file ID and/or platform ID. Includes platform info.
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
 *     responses:
 *       200:
 *         description: Array of playback tests with platform info
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   episodeFileId:
 *                     type: integer
 *                   platformId:
 *                     type: integer
 *                   status:
 *                     $ref: '#/components/schemas/PlaybackStatus'
 *                   notes:
 *                     type: string
 *                     nullable: true
 *                   testedAt:
 *                     type: string
 *                     format: date-time
 *                   platform:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
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
import { checkAdmin } from '@/lib/auth';

const VALID_STATUSES: PlaybackStatus[] = ['PASS', 'PARTIAL', 'FAIL'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const platformId = searchParams.get('platformId');

    const where: { episodeFileId?: number; platformId?: number } = {};

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

    const tests = await prisma.playbackTest.findMany({
      where,
      orderBy: { testedAt: 'desc' },
      include: {
        platform: true,
      },
    });

    return NextResponse.json(tests);
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
        { error: 'Valid status is required (PASS, PARTIAL, FAIL)' },
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
