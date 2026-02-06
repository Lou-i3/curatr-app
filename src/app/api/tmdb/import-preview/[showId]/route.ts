/**
 * TMDB Import Preview API
 * Fetches all seasons/episodes from TMDB and compares with existing DB records
 * Supports episode groups for alternative orderings (DVD order, absolute order, etc.)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getSeasonDetails,
  getTVShowDetails,
  getEpisodeGroups,
  getEpisodeGroupDetails,
} from '@/lib/tmdb/client';
import { isTmdbConfigured } from '@/lib/tmdb/config';
import type {
  ImportPreviewResponse,
  ImportPreviewSeason,
  ImportPreviewEpisode,
  EpisodeGroupOption,
  EPISODE_GROUP_TYPE_LABELS,
} from '@/lib/tmdb/types';
import { EPISODE_GROUP_TYPE_LABELS as TYPE_LABELS } from '@/lib/tmdb/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    if (!isTmdbConfigured()) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 503 }
      );
    }

    const { showId } = await params;
    const showIdNum = parseInt(showId, 10);

    if (isNaN(showIdNum)) {
      return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 });
    }

    // Check for episode group ID in query params
    const url = new URL(request.url);
    const episodeGroupId = url.searchParams.get('episodeGroup');

    // Get the show with existing seasons and episodes
    const show = await prisma.tVShow.findUnique({
      where: { id: showIdNum },
      include: {
        seasons: {
          include: {
            episodes: {
              include: {
                files: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!show.tmdbId) {
      return NextResponse.json(
        { error: 'Show is not matched to TMDB' },
        { status: 400 }
      );
    }

    // Build season map for quick lookup
    const existingSeasons = new Map(
      show.seasons.map((s) => [s.seasonNumber, s])
    );

    // Helper to find existing episode by TMDB episode ID or episode number
    const findExistingEpisode = (
      seasonNumber: number,
      episodeNumber: number
    ) => {
      const existingSeason = existingSeasons.get(seasonNumber);
      if (!existingSeason) return null;
      return existingSeason.episodes.find((e) => e.episodeNumber === episodeNumber) ?? null;
    };

    let seasons: ImportPreviewSeason[] = [];

    // If episode group is specified, use that ordering
    if (episodeGroupId) {
      const groupDetails = await getEpisodeGroupDetails(episodeGroupId);

      for (const group of groupDetails.groups) {
        // Each group becomes a "season" in our structure
        const groupNumber = group.order + 1; // TMDB uses 0-based order

        const existingSeason = existingSeasons.get(groupNumber);

        const episodes: ImportPreviewEpisode[] = group.episodes.map((ep, index) => {
          // Use the episode's order within the group as the episode number
          const episodeNumber = index + 1;
          const existingEp = findExistingEpisode(groupNumber, episodeNumber);

          return {
            tmdbEpisodeId: ep.id,
            episodeNumber,
            name: ep.name,
            overview: ep.overview,
            airDate: ep.air_date,
            runtime: ep.runtime,
            stillPath: ep.still_path,
            voteAverage: ep.vote_average,
            existingEpisodeId: existingEp?.id ?? null,
            hasFiles: existingEp ? existingEp.files.length > 0 : false,
          };
        });

        seasons.push({
          tmdbSeasonId: parseInt(group.id) || groupNumber,
          seasonNumber: groupNumber,
          name: group.name,
          overview: '',
          airDate: null,
          posterPath: null,
          episodeCount: group.episodes.length,
          existingSeasonId: existingSeason?.id ?? null,
          episodes,
        });
      }
    } else {
      // Use default TMDB season/episode structure
      const tmdbShow = await getTVShowDetails(show.tmdbId);

      for (const tmdbSeason of tmdbShow.seasons) {
        // Fetch full season details with episodes
        const seasonDetails = await getSeasonDetails(show.tmdbId, tmdbSeason.season_number);

        const existingSeason = existingSeasons.get(tmdbSeason.season_number);

        // Build episode map for quick lookup
        const existingEpisodes = existingSeason
          ? new Map(existingSeason.episodes.map((e) => [e.episodeNumber, e]))
          : new Map();

        const episodes: ImportPreviewEpisode[] = seasonDetails.episodes.map((ep) => {
          const existingEp = existingEpisodes.get(ep.episode_number);
          return {
            tmdbEpisodeId: ep.id,
            episodeNumber: ep.episode_number,
            name: ep.name,
            overview: ep.overview,
            airDate: ep.air_date,
            runtime: ep.runtime,
            stillPath: ep.still_path,
            voteAverage: ep.vote_average,
            existingEpisodeId: existingEp?.id ?? null,
            hasFiles: existingEp ? existingEp.files.length > 0 : false,
          };
        });

        seasons.push({
          tmdbSeasonId: seasonDetails.id,
          seasonNumber: seasonDetails.season_number,
          name: seasonDetails.name,
          overview: seasonDetails.overview,
          airDate: seasonDetails.air_date,
          posterPath: seasonDetails.poster_path,
          episodeCount: seasonDetails.episodes.length,
          existingSeasonId: existingSeason?.id ?? null,
          episodes,
        });
      }
    }

    // Fetch available episode groups
    let episodeGroups: EpisodeGroupOption[] = [];
    try {
      const groupsResponse = await getEpisodeGroups(show.tmdbId);
      episodeGroups = groupsResponse.results.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        typeLabel: TYPE_LABELS[g.type] || 'Unknown',
        episodeCount: g.episode_count,
        groupCount: g.group_count,
      }));
    } catch {
      // Episode groups may not be available for all shows
      episodeGroups = [];
    }

    const response: ImportPreviewResponse = {
      show: {
        id: show.id,
        title: show.title,
        tmdbId: show.tmdbId,
      },
      seasons,
      episodeGroups,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch import preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import preview' },
      { status: 500 }
    );
  }
}
