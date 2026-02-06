/**
 * Season CRUD API
 * PATCH: Update season details
 * DELETE: Delete season (only if no episode files attached)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Status } from '@/generated/prisma';

const VALID_STATUSES: Status[] = ['TO_CHECK', 'BAD', 'GOOD', 'DELETED', 'MISSING', 'UNWANTED'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seasonId = parseInt(id, 10);

    if (isNaN(seasonId)) {
      return NextResponse.json({ error: 'Invalid season ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, seasonNumber, status, notes, posterPath, description, airDate } = body;

    // Build update data
    const updateData: {
      name?: string | null;
      seasonNumber?: number;
      status?: Status;
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

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
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
