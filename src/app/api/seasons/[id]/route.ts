/**
 * Season CRUD API
 * PATCH: Update season details including monitorStatus with optional cascade
 * DELETE: Delete season (only if no episode files attached)
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
    const seasonId = parseInt(id, 10);

    if (isNaN(seasonId)) {
      return NextResponse.json({ error: 'Invalid season ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      seasonNumber,
      monitorStatus,
      cascade,
      notes,
      posterPath,
      description,
      airDate,
    } = body;

    // Build update data
    const updateData: {
      name?: string | null;
      seasonNumber?: number;
      monitorStatus?: MonitorStatus;
      notes?: string | null;
      posterPath?: string | null;
      description?: string | null;
      airDate?: Date | null;
    } = {};

    if (name !== undefined) {
      updateData.name = name || null;
    }

    if (seasonNumber !== undefined) {
      // Validate season number change is safe
      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        include: { episodes: { select: { id: true } } },
      });

      if (season && season.episodes.length > 0 && seasonNumber !== season.seasonNumber) {
        return NextResponse.json(
          { error: 'Cannot change season number when episodes exist' },
          { status: 400 }
        );
      }

      updateData.seasonNumber = seasonNumber;
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

    if (posterPath !== undefined) {
      updateData.posterPath = posterPath || null;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (airDate !== undefined) {
      updateData.airDate = airDate ? new Date(airDate) : null;
    }

    // If cascade is true and monitorStatus is being changed, update all episodes
    if (cascade && monitorStatus !== undefined) {
      await prisma.$transaction([
        prisma.season.update({
          where: { id: seasonId },
          data: updateData,
        }),
        prisma.episode.updateMany({
          where: { seasonId },
          data: { monitorStatus },
        }),
      ]);

      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      return NextResponse.json(season);
    }

    const season = await prisma.season.update({
      where: { id: seasonId },
      data: updateData,
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error('Failed to update season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
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
    const seasonId = parseInt(id, 10);

    if (isNaN(seasonId)) {
      return NextResponse.json({ error: 'Invalid season ID' }, { status: 400 });
    }

    // Check if any episodes have files
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        episodes: {
          include: {
            files: { select: { id: true } },
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const hasFiles = season.episodes.some((ep) => ep.files.length > 0);

    if (hasFiles) {
      return NextResponse.json(
        { error: 'Cannot delete season with files attached to episodes' },
        { status: 400 }
      );
    }

    await prisma.season.delete({
      where: { id: seasonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete season:', error);
    return NextResponse.json(
      { error: 'Failed to delete season' },
      { status: 500 }
    );
  }
}
