/**
 * Playback Test CRUD API
 * GET: Get single test
 * PATCH: Update test
 * DELETE: Delete test
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlaybackStatus } from '@/generated/prisma/client';
import { recomputeFileQuality } from '@/lib/playback-status';
import { checkAdmin } from '@/lib/auth';

const VALID_STATUSES: PlaybackStatus[] = ['PASS', 'PARTIAL', 'FAIL'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
          { error: 'Invalid status (must be PASS, PARTIAL, or FAIL)' },
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
