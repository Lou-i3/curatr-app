/**
 * Single-show file sync API
 * POST: Start a sync for a single show's folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { access, constants } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { startScan } from '@/lib/scanner';
import { getShowFolderPath } from '@/lib/scanner/config';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const showId = parseInt(id, 10);

    if (isNaN(showId)) {
      return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
    }

    // Get show details
    const show = await prisma.tVShow.findUnique({
      where: { id: showId },
      select: { id: true, title: true, folderName: true },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!show.folderName) {
      return NextResponse.json(
        { error: 'Show has no folder name - run a full library scan first' },
        { status: 400 }
      );
    }

    // Verify the folder exists
    const folderPath = getShowFolderPath(show.folderName);
    if (!folderPath) {
      return NextResponse.json(
        { error: 'TV shows path not configured' },
        { status: 400 }
      );
    }

    try {
      await access(folderPath, constants.R_OK);
    } catch {
      return NextResponse.json(
        { error: `Folder not accessible: ${show.folderName}` },
        { status: 400 }
      );
    }

    // Start single-show scan
    const { scanId, taskId } = await startScan({
      scanType: 'full',
      skipMetadata: true,
      targetShowId: show.id,
      targetFolderName: show.folderName,
      targetShowTitle: `Sync: ${show.title}`,
    });

    return NextResponse.json({
      scanId,
      taskId,
      status: 'started',
      message: `Sync started for "${show.title}"`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start sync';
    console.error('Single-show sync failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
