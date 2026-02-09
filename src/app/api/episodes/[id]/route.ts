/**
 * Episode CRUD API
 * PATCH: Update episode details including monitorStatus
 * DELETE: Delete episode (only if no files attached)
 *
 * @swagger
 * /api/episodes/{id}:
 *   patch:
 *     summary: Update an episode
 *     description: Update episode details including metadata and monitor status.
 *     tags: [Episodes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Episode ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 nullable: true
 *               episodeNumber:
 *                 type: integer
 *               monitorStatus:
 *                 $ref: '#/components/schemas/MonitorStatus'
 *               notes:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               airDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               runtime:
 *                 type: integer
 *                 nullable: true
 *               stillPath:
 *                 type: string
 *                 nullable: true
 *               voteAverage:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated episode object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete an episode
 *     description: Delete an episode. Fails if the episode has files attached.
 *     tags: [Episodes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Episode ID
 *     responses:
 *       200:
 *         description: Episode deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Cannot delete episode with files attached
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
 *         description: Episode not found
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
