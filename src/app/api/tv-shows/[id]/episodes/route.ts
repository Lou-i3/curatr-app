/**
 * TV Show Episodes API — lightweight endpoint for listing seasons/episodes
 * Used by the issue report search dialog for episode selection
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
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
