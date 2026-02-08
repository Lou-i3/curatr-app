/**
 * TV Show CRUD API
 * PATCH: Update show details including monitorStatus with optional cascade
 * DELETE: Delete show and all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MonitorStatus } from '@/generated/prisma/client';
import { checkAdmin } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

const VALID_MONITOR_STATUSES: MonitorStatus[] = ['WANTED', 'UNWANTED'];

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const showId = parseInt(id, 10);

    if (isNaN(showId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      folderName,
      year,
      monitorStatus,
      cascade,
      notes,
      description,
      posterPath,
      backdropPath,
    } = body;

    const updateData: {
      title?: string;
      folderName?: string | null;
      year?: number | null;
      monitorStatus?: MonitorStatus;
      notes?: string | null;
      description?: string | null;
      posterPath?: string | null;
      backdropPath?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (folderName !== undefined) {
      updateData.folderName = folderName || null;
    }

    if (year !== undefined) {
      updateData.year = year ? parseInt(year, 10) : null;
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

    if (posterPath !== undefined) {
      updateData.posterPath = posterPath || null;
    }

    if (backdropPath !== undefined) {
      updateData.backdropPath = backdropPath || null;
    }

    // If cascade is true and monitorStatus is being changed, update all children
    if (cascade && monitorStatus !== undefined) {
      await prisma.$transaction([
        prisma.tVShow.update({
          where: { id: showId },
          data: updateData,
        }),
        prisma.season.updateMany({
          where: { tvShowId: showId },
          data: { monitorStatus },
        }),
        prisma.episode.updateMany({
          where: { season: { tvShowId: showId } },
          data: { monitorStatus },
        }),
      ]);

      const show = await prisma.tVShow.findUnique({ where: { id: showId } });
      return NextResponse.json(show);
    }

    const show = await prisma.tVShow.update({
      where: { id: showId },
      data: updateData,
    });

    return NextResponse.json(show);
  } catch (error) {
    console.error('Failed to update TV show:', error);
    return NextResponse.json(
      { error: 'Failed to update TV show' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const showId = parseInt(id, 10);

    if (isNaN(showId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Delete the show and all related data (cascades defined in schema)
    await prisma.tVShow.delete({
      where: { id: showId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete TV show:', error);
    return NextResponse.json(
      { error: 'Failed to delete TV show' },
      { status: 500 }
    );
  }
}
