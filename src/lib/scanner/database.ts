/**
 * Database module - Prisma operations for the scanner
 *
 * Handles creating/updating TV show hierarchy and scan history
 */

import { prisma } from '@/lib/prisma';
import { ScanStatus } from '@/generated/prisma/client';
import type {
  ParsedFilename,
  DiscoveredFile,
  MediaMetadata,
} from './types';
import { showNameMatchKey } from './parser';

/** Result of hierarchy lookup/creation */
export interface HierarchyResult {
  showId: number;
  seasonId: number;
  episodeId: number;
}

/**
 * Find or create the TV show hierarchy (Show -> Season -> Episode)
 * Uses upserts for idempotent operations
 */
export async function findOrCreateHierarchy(
  parsed: ParsedFilename
): Promise<HierarchyResult> {
  // First, try to find existing show by normalized title
  // We look for shows where the lowercase alphanumeric matches
  const allShows = await prisma.tVShow.findMany({
    select: { id: true, title: true, year: true },
  });

  const matchKey = showNameMatchKey(parsed.showName);
  let existingShow = allShows.find(
    (show) => showNameMatchKey(show.title) === matchKey
  );

  // If we have a year and found a show without year, or vice versa, still match
  // But prefer exact year match if multiple shows with same name
  if (!existingShow && parsed.year) {
    existingShow = allShows.find(
      (show) =>
        showNameMatchKey(show.title) === matchKey && show.year === parsed.year
    );
  }

  let showId: number;

  if (existingShow) {
    showId = existingShow.id;
    // Update year if we now have one and the show doesn't
    if (parsed.year && !existingShow.year) {
      await prisma.tVShow.update({
        where: { id: showId },
        data: { year: parsed.year },
      });
    }
  } else {
    // Create new show
    const newShow = await prisma.tVShow.create({
      data: {
        title: parsed.showName,
        year: parsed.year,
      },
    });
    showId = newShow.id;
  }

  // Find or create Season
  const season = await prisma.season.upsert({
    where: {
      tvShowId_seasonNumber: {
        tvShowId: showId,
        seasonNumber: parsed.seasonNumber,
      },
    },
    create: {
      tvShowId: showId,
      seasonNumber: parsed.seasonNumber,
    },
    update: {},
  });

  // Find or create Episode
  const episode = await prisma.episode.upsert({
    where: {
      seasonId_episodeNumber: {
        seasonId: season.id,
        episodeNumber: parsed.episodeNumber,
      },
    },
    create: {
      seasonId: season.id,
      episodeNumber: parsed.episodeNumber,
      title: parsed.episodeTitle,
    },
    update: {
      // Update title if we now have one and the episode doesn't
      ...(parsed.episodeTitle ? { title: parsed.episodeTitle } : {}),
    },
  });

  return {
    showId,
    seasonId: season.id,
    episodeId: episode.id,
  };
}

/**
 * Create or update an episode file record
 * @returns 'created', 'updated', or 'unchanged'
 */
export async function upsertEpisodeFile(
  episodeId: number,
  file: DiscoveredFile,
  metadata: MediaMetadata | null
): Promise<'created' | 'updated' | 'unchanged'> {
  const existing = await prisma.episodeFile.findUnique({
    where: { filepath: file.filepath },
  });

  const fileData = {
    episodeId,
    filepath: file.filepath,
    filename: file.filename,
    fileSize: file.fileSize,
    dateModified: file.dateModified,
    fileExists: true,
    status: 'TO_CHECK' as const,
    action: 'NOTHING' as const,
    arrStatus: 'MONITORED' as const,
    ...(metadata
      ? {
          codec: metadata.codec,
          resolution: metadata.resolution,
          bitrate: metadata.bitrate,
          container: metadata.container,
          audioFormat: metadata.audioFormat,
          hdrType: metadata.hdrType,
          duration: metadata.duration,
          audioLanguages: JSON.stringify(metadata.audioLanguages),
          subtitleLanguages: JSON.stringify(metadata.subtitleLanguages),
          metadataSource: 'ffprobe',
        }
      : {}),
  };

  if (!existing) {
    // Create new file record
    await prisma.episodeFile.create({ data: fileData });
    return 'created';
  }

  // Check if file has changed (size or modified date)
  const hasChanged =
    existing.fileSize !== file.fileSize ||
    existing.dateModified.getTime() !== file.dateModified.getTime() ||
    !existing.fileExists;

  if (hasChanged) {
    await prisma.episodeFile.update({
      where: { id: existing.id },
      data: fileData,
    });
    return 'updated';
  }

  return 'unchanged';
}

/**
 * Mark files as deleted if they no longer exist on disk
 * @param existingFilepaths - Set of file paths found during scan
 * @returns Number of files marked as deleted
 */
export async function markMissingFilesAsDeleted(
  existingFilepaths: Set<string>
): Promise<number> {
  // Get all files currently marked as existing
  const dbFiles = await prisma.episodeFile.findMany({
    where: { fileExists: true },
    select: { id: true, filepath: true },
  });

  // Find files not in the current scan
  const missingIds = dbFiles
    .filter((f) => !existingFilepaths.has(f.filepath))
    .map((f) => f.id);

  if (missingIds.length === 0) {
    return 0;
  }

  // Batch update
  const result = await prisma.episodeFile.updateMany({
    where: { id: { in: missingIds } },
    data: {
      fileExists: false,
      status: 'DELETED',
    },
  });

  return result.count;
}

/**
 * Create a new scan history record
 */
export async function createScanHistory(scanType: string): Promise<number> {
  const scan = await prisma.scanHistory.create({
    data: {
      scanType,
      status: ScanStatus.RUNNING,
    },
  });
  return scan.id;
}

/**
 * Update scan history with progress or completion
 */
export async function updateScanHistory(
  scanId: number,
  updates: {
    status?: ScanStatus;
    completedAt?: Date;
    filesScanned?: number;
    filesAdded?: number;
    filesUpdated?: number;
    filesDeleted?: number;
    errors?: string;
  }
): Promise<void> {
  await prisma.scanHistory.update({
    where: { id: scanId },
    data: updates,
  });
}

/**
 * Get scan history by ID
 */
export async function getScanHistory(scanId: number) {
  return prisma.scanHistory.findUnique({
    where: { id: scanId },
  });
}

/**
 * Get recent scan history
 */
export async function getRecentScans(limit: number = 20) {
  return prisma.scanHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
