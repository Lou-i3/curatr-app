/**
 * Episode CRUD API
 * PATCH: Update episode details including monitorStatus
 * DELETE: Delete episode (only if no files attached)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MonitorStatus } from '@/generated/prisma/client';
import { checkAdmin } from '@/lib/auth';

const VALID_MONITOR_STATUSES: MonitorStatus[] = ['WANTED', 'UNWANTED'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const episodeId = parseInt(id, 10);

    if (isNaN(episodeId)) {
      return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      episodeNumber,
      monitorStatus,
      notes,
      description,
      airDate,
      runtime,
      stillPath,
      voteAverage,
    } = body;

    // Build update data
    const updateData: {
      title?: string | null;
      episodeNumber?: number;
      monitorStatus?: MonitorStatus;
      notes?: string | null;
      description?: string | null;
      airDate?: Date | null;
      runtime?: number | null;
      stillPath?: string | null;
      voteAverage?: number | null;
    } = {};

    if (title !== undefined) {
      updateData.title = title || null;
    }

    if (episodeNumber !== undefined) {
      // Validate episode number change is safe
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: { files: { select: { id: true } } },
      });

      if (episode && episode.files.length > 0 && episodeNumber !== episode.episodeNumber) {
        return NextResponse.json(
          { error: 'Cannot change episode number when files exist' },
          { status: 400 }
        );
      }

      updateData.episodeNumber = episodeNumber;
    }

    if (monitorStatus !== undefined) {
      if (!VALID_MONITOR_STATUSES.includes(monitorStatus)) {
        return NextResponse.json({ error: 'Invalid monitorStatus' }, { status: 400 });
      }
      updateData.monitorStatus = monitorStatus;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (airDate !== undefined) {
      updateData.airDate = airDate ? new Date(airDate) : null;
    }

    if (runtime !== undefined) {
      updateData.runtime = runtime ?? null;
    }

    if (stillPath !== undefined) {
      updateData.stillPath = stillPath || null;
    }

    if (voteAverage !== undefined) {
      updateData.voteAverage = voteAverage ?? null;
    }

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: updateData,
    });

    return NextResponse.json(episode);
  } catch (error) {
    console.error('Failed to update episode:', error);
    return NextResponse.json(
      { error: 'Failed to update episode' },
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
    const episodeId = parseInt(id, 10);

    if (isNaN(episodeId)) {
      return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
    }

    // Check if episode has files
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: { files: { select: { id: true } } },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.files.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete episode with files attached' },
        { status: 400 }
      );
    }

    await prisma.episode.delete({
      where: { id: episodeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete episode:', error);
    return NextResponse.json(
      { error: 'Failed to delete episode' },
      { status: 500 }
    );
  }
}
