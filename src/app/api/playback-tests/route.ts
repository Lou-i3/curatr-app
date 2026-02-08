/**
 * Playback Tests API
 * GET: List tests (filter by fileId, platformId)
 * POST: Create new test
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
