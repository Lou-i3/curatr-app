/**
 * Episode Files API
 * GET: List files for an episode with playback tests
 *
 * @swagger
 * /api/episodes/{id}/files:
 *   get:
 *     summary: List files for an episode
 *     description: >
 *       Returns all files for an episode, each with nested playback tests
 *       and platform information, ordered by filename.
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Episode ID
 *     responses:
 *       200:
 *         description: Array of episode files with playback tests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   filename:
 *                     type: string
 *                   quality:
 *                     $ref: '#/components/schemas/FileQuality'
 *                   playbackTests:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         testedAt:
 *                           type: string
 *                           format: date-time
 *                         platform:
 *                           type: object
 *       400:
 *         description: Validation error
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episodeId = parseInt(id, 10);

    if (isNaN(episodeId)) {
      return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
    }

    const files = await prisma.episodeFile.findMany({
      where: { episodeId },
      orderBy: { filename: 'asc' },
      select: {
        id: true,
        filename: true,
        quality: true,
        playbackTests: {
          orderBy: { testedAt: 'desc' },
          include: {
            platform: true,
          },
        },
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to fetch episode files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episode files' },
      { status: 500 }
    );
  }
}
