/**
 * Episode Languages API
 * GET: Fetch aggregated audio/subtitle languages for a set of episodes
 *
 * @swagger
 * /api/episodes/languages:
 *   get:
 *     summary: Get languages for episodes
 *     description: Returns aggregated audio and subtitle languages from files of the specified episodes.
 *     tags: [Episodes]
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated episode IDs
 *     responses:
 *       200:
 *         description: Aggregated languages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 audioLanguages:
 *                   type: array
 *                   items:
 *                     type: string
 *                 subtitleLanguages:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing or invalid ids parameter
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
import { collectLanguages } from '@/lib/languages';

export async function GET(request: Request) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'ids parameter is required' }, { status: 400 });
    }

    const episodeIds = idsParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (episodeIds.length === 0) {
      return NextResponse.json({ error: 'No valid episode IDs provided' }, { status: 400 });
    }

    const files = await prisma.episodeFile.findMany({
      where: { episodeId: { in: episodeIds }, fileExists: true },
      select: { audioLanguages: true, subtitleLanguages: true },
    });

    return NextResponse.json({
      audioLanguages: collectLanguages(files, 'audioLanguages'),
      subtitleLanguages: collectLanguages(files, 'subtitleLanguages'),
    });
  } catch (error) {
    console.error('Failed to fetch episode languages:', error);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}
