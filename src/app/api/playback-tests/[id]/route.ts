/**
 * Playback Test CRUD API
 * GET: Get single test
 * PATCH: Update test
 * DELETE: Delete test
 *
 * @swagger
 * /api/playback-tests/{id}:
 *   get:
 *     summary: Get playback test details
 *     description: Returns a single playback test by ID, including platform and episode file info.
 *     tags: [Playback Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playback test ID
 *     responses:
 *       200:
 *         description: Playback test details
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
 *                 episodeFile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     filename:
 *                       type: string
 *                     quality:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid test ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Test not found
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
 *   patch:
 *     summary: Update a playback test
 *     description: Updates playback test fields. Only provided fields are changed. Recomputes file quality if status changes.
 *     tags: [Playback Tests]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playback test ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/PlaybackStatus'
 *               notes:
 *                 type: string
 *               testedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Updated playback test
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
 *         description: Invalid test ID or invalid status
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
 *         description: Test not found
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
 *   delete:
 *     summary: Delete a playback test
 *     description: Deletes a playback test. Recomputes file quality after deletion.
 *     tags: [Playback Tests]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playback test ID
 *     responses:
 *       200:
 *         description: Test deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid test ID
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
 *         description: Test not found
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { id } = await params;
    const testId = parseInt(id, 10);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const test = await prisma.playbackTest.findUnique({
      where: { id: testId },
      include: {
        platform: true,
        episodeFile: {
          select: {
            id: true,
            filename: true,
            quality: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Failed to fetch playback test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playback test' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const testId = parseInt(id, 10);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    // Get the existing test to find the file ID
    const existingTest = await prisma.playbackTest.findUnique({
      where: { id: testId },
    });

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, testedAt } = body;

    // Build update data
    const updateData: {
      status?: PlaybackStatus;
      notes?: string | null;
      testedAt?: Date;
    } = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status (must be PASS or FAIL)' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (testedAt !== undefined) {
      updateData.testedAt = new Date(testedAt);
    }

    const test = await prisma.playbackTest.update({
      where: { id: testId },
      data: updateData,
      include: {
        platform: true,
      },
    });

    // Recompute file quality if status changed
    if (status !== undefined && existingTest.episodeFileId) {
      await recomputeFileQuality(existingTest.episodeFileId);
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Failed to update playback test:', error);
    return NextResponse.json(
      { error: 'Failed to update playback test' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const testId = parseInt(id, 10);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    // Get the test to find the file ID before deleting
    const test = await prisma.playbackTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const fileId = test.episodeFileId;

    await prisma.playbackTest.delete({
      where: { id: testId },
    });

    // Recompute file quality after deleting test
    if (fileId) {
      await recomputeFileQuality(fileId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete playback test:', error);
    return NextResponse.json(
      { error: 'Failed to delete playback test' },
      { status: 500 }
    );
  }
}
