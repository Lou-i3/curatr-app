/**
 * TMDB Import API
 * Creates selected seasons and episodes in database
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ImportRequest, ImportResult } from '@/lib/tmdb/types';

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();
    const { showId, items } = body;

    if (!showId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verify show exists
    const show = await prisma.tVShow.findUnique({
      where: { id: showId },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    let seasonsCreated = 0;
    let seasonsUpdated = 0;
    let episodesCreated = 0;
    let episodesUpdated = 0;

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const seasonData of items) {
        // Upsert season
        const existingSeason = await tx.season.findUnique({
          where: {
            tvShowId_seasonNumber: {
              tvShowId: showId,
              seasonNumber: seasonData.seasonNumber,
            },
          },
        });

        const season = await tx.season.upsert({
          where: {
            tvShowId_seasonNumber: {
              tvShowId: showId,
              seasonNumber: seasonData.seasonNumber,
            },
          },
          create: {
            tvShowId: showId,
            seasonNumber: seasonData.seasonNumber,
            name: seasonData.name,
            tmdbSeasonId: seasonData.tmdbSeasonId,
            posterPath: seasonData.posterPath,
            description: seasonData.description,
            airDate: seasonData.airDate ? new Date(seasonData.airDate) : null,
          },
          update: {
            name: seasonData.name,
            tmdbSeasonId: seasonData.tmdbSeasonId,
            posterPath: seasonData.posterPath,
            description: seasonData.description,
            airDate: seasonData.airDate ? new Date(seasonData.airDate) : null,
          },
        });

        if (existingSeason) {
          seasonsUpdated++;
        } else {
          seasonsCreated++;
        }

        // Upsert episodes
        for (const episodeData of seasonData.episodes) {
          const existingEpisode = await tx.episode.findUnique({
            where: {
              seasonId_episodeNumber: {
                seasonId: season.id,
                episodeNumber: episodeData.episodeNumber,
              },
            },
          });

          await tx.episode.upsert({
            where: {
              seasonId_episodeNumber: {
                seasonId: season.id,
                episodeNumber: episodeData.episodeNumber,
              },
            },
            create: {
              seasonId: season.id,
              episodeNumber: episodeData.episodeNumber,
              title: episodeData.title,
              tmdbEpisodeId: episodeData.tmdbEpisodeId,
              stillPath: episodeData.stillPath,
              description: episodeData.description,
              airDate: episodeData.airDate ? new Date(episodeData.airDate) : null,
              runtime: episodeData.runtime,
              voteAverage: episodeData.voteAverage,
              status: episodeData.status,
            },
            update: {
              title: episodeData.title,
              tmdbEpisodeId: episodeData.tmdbEpisodeId,
              stillPath: episodeData.stillPath,
              description: episodeData.description,
              airDate: episodeData.airDate ? new Date(episodeData.airDate) : null,
              runtime: episodeData.runtime,
              voteAverage: episodeData.voteAverage,
              // Don't override status if episode already exists (user may have set it)
              ...(existingEpisode ? {} : { status: episodeData.status }),
            },
          });

          if (existingEpisode) {
            episodesUpdated++;
          } else {
            episodesCreated++;
          }
        }
      }
    });

    const result: ImportResult = {
      seasonsCreated,
      seasonsUpdated,
      episodesCreated,
      episodesUpdated,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to import seasons/episodes:', error);
    return NextResponse.json(
      { error: 'Failed to import seasons/episodes' },
      { status: 500 }
    );
  }
}
