/**
 * TV Show Episodes API — lightweight endpoint for listing seasons/episodes
 * Used by the issue report search dialog for episode selection
 *
 * @swagger
 * /api/tv-shows/{id}/episodes:
 *   get:
 *     summary: List seasons and episodes for a show
 *     description: >
 *       Returns a lightweight list of seasons with nested episodes,
 *       used for episode selection in the issue report search dialog.
 *     tags: [Episodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TV show ID
 *     responses:
 *       200:
 *         description: Array of seasons with nested episodes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   seasonNumber:
 *                     type: integer
 *                   episodes:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         episodeNumber:
 *                           type: integer
 *                         title:
 *                           type: string
 *                           nullable: true
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
import { checkAuth } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { id } = await context.params;
    const showId = parseInt(id, 10);
    if (isNaN(showId)) {
      return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
    }

    const seasons = await prisma.season.findMany({
      where: { tvShowId: showId },
      orderBy: { seasonNumber: 'asc' },
      select: {
        id: true,
        seasonNumber: true,
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          select: {
            id: true,
            episodeNumber: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(seasons);
  } catch (error) {
    console.error('Failed to fetch episodes:', error);
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
