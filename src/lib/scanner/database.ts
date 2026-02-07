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
  BatchItem,
  BatchResult,
} from './types';
import { showNameMatchKey } from './parser';

/** Cache for show lookups during batch processing */
interface ShowCache {
  byMatchKey: Map<string, { id: number; title: string; folderName: string | null; year: number | null }>;
  byFolderName: Map<string, { id: number; title: string; folderName: string | null; year: number | null }>;
}

/** Cache for season lookups during batch processing */
interface SeasonCache {
  byKey: Map<string, number>; // "showId-seasonNum" -> seasonId
}

/** Cache for episode lookups during batch processing */
interface EpisodeCache {
  byKey: Map<string, number>; // "seasonId-episodeNum" -> episodeId
}

/** Cache for existing files */
interface FileCache {
  byPath: Map<string, { id: number; fileSize: bigint; dateModified: Date; fileExists: boolean }>;
}

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
  // Load all shows for matching
  const allShows = await prisma.tVShow.findMany({
    select: { id: true, title: true, folderName: true, year: true },
  });

  // First, try to match by folderName (most reliable for renamed shows)
  let existingShow = parsed.folderName
    ? allShows.find((show) => show.folderName === parsed.folderName)
    : undefined;

  // Fall back to title matching
  if (!existingShow) {
    const matchKey = showNameMatchKey(parsed.showName);
    existingShow = allShows.find(
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
    // Update folderName if we have one and the show doesn't
    if (parsed.folderName && !existingShow.folderName) {
      await prisma.tVShow.update({
        where: { id: showId },
        data: { folderName: parsed.folderName },
      });
    }
  } else {
    // Create new show with folderName
    const newShow = await prisma.tVShow.create({
      data: {
        title: parsed.showName,
        folderName: parsed.folderName || null,
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
    quality: 'UNVERIFIED' as const,
    action: 'NOTHING' as const,
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

  // Batch update to avoid SQLite parameter limit (max ~999 params per query)
  const BATCH_SIZE = 500;
  let totalUpdated = 0;

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE);
    const result = await prisma.episodeFile.updateMany({
      where: { id: { in: batch } },
      data: { fileExists: false },
    });
    totalUpdated += result.count;
  }

  return totalUpdated;
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

/**
 * Batch processor for efficient database operations
 * Processes multiple files in a single transaction to minimize DB locks
 */
export class BatchProcessor {
  private showCache: ShowCache = { byMatchKey: new Map(), byFolderName: new Map() };
  private seasonCache: SeasonCache = { byKey: new Map() };
  private episodeCache: EpisodeCache = { byKey: new Map() };
  private fileCache: FileCache = { byPath: new Map() };
  private initialized = false;

  /**
   * Initialize caches by loading existing data from database
   * Call this once before processing batches
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all shows
    const shows = await prisma.tVShow.findMany({
      select: { id: true, title: true, folderName: true, year: true },
    });
    for (const show of shows) {
      const key = showNameMatchKey(show.title);
      this.showCache.byMatchKey.set(key, show);
      // Also cache by folderName if it exists
      if (show.folderName) {
        this.showCache.byFolderName.set(show.folderName, show);
      }
    }

    // Load all seasons
    const seasons = await prisma.season.findMany({
      select: { id: true, tvShowId: true, seasonNumber: true },
    });
    for (const season of seasons) {
      const key = `${season.tvShowId}-${season.seasonNumber}`;
      this.seasonCache.byKey.set(key, season.id);
    }

    // Load all episodes
    const episodes = await prisma.episode.findMany({
      select: { id: true, seasonId: true, episodeNumber: true },
    });
    for (const episode of episodes) {
      const key = `${episode.seasonId}-${episode.episodeNumber}`;
      this.episodeCache.byKey.set(key, episode.id);
    }

    // Load all existing files
    const files = await prisma.episodeFile.findMany({
      select: { id: true, filepath: true, fileSize: true, dateModified: true, fileExists: true },
    });
    for (const file of files) {
      this.fileCache.byPath.set(file.filepath, {
        id: file.id,
        fileSize: file.fileSize,
        dateModified: file.dateModified,
        fileExists: file.fileExists,
      });
    }

    this.initialized = true;
  }

  /**
   * Process a batch of items in a single transaction
   */
  async processBatch(items: BatchItem[]): Promise<BatchResult> {
    const result: BatchResult = { filesAdded: 0, filesUpdated: 0, filesUnchanged: 0 };

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const { parsed, file } = item;

        // 1. Find or create show
        // First try to match by folderName (most reliable for renamed shows)
        let showData = parsed.folderName
          ? this.showCache.byFolderName.get(parsed.folderName)
          : undefined;

        // Fall back to title matching if no folderName match
        if (!showData) {
          const showMatchKey = showNameMatchKey(parsed.showName);
          showData = this.showCache.byMatchKey.get(showMatchKey);
        }

        if (!showData) {
          // Create new show with folderName
          const newShow = await tx.tVShow.create({
            data: {
              title: parsed.showName,
              folderName: parsed.folderName || null,
              year: parsed.year,
            },
          });
          showData = {
            id: newShow.id,
            title: newShow.title,
            folderName: newShow.folderName,
            year: newShow.year,
          };
          // Cache by both matchKey and folderName
          const showMatchKey = showNameMatchKey(parsed.showName);
          this.showCache.byMatchKey.set(showMatchKey, showData);
          if (parsed.folderName) {
            this.showCache.byFolderName.set(parsed.folderName, showData);
          }
        } else {
          // Update year if we now have one
          if (parsed.year && !showData.year) {
            await tx.tVShow.update({
              where: { id: showData.id },
              data: { year: parsed.year },
            });
            showData.year = parsed.year;
          }
          // Update folderName if we have one and the show doesn't
          if (parsed.folderName && !showData.folderName) {
            await tx.tVShow.update({
              where: { id: showData.id },
              data: { folderName: parsed.folderName },
            });
            showData.folderName = parsed.folderName;
            this.showCache.byFolderName.set(parsed.folderName, showData);
          }
        }

        // 2. Find or create season
        const seasonKey = `${showData.id}-${parsed.seasonNumber}`;
        let seasonId = this.seasonCache.byKey.get(seasonKey);

        if (!seasonId) {
          const newSeason = await tx.season.create({
            data: { tvShowId: showData.id, seasonNumber: parsed.seasonNumber },
          });
          seasonId = newSeason.id;
          this.seasonCache.byKey.set(seasonKey, seasonId);
        }

        // 3. Find or create episode
        const episodeKey = `${seasonId}-${parsed.episodeNumber}`;
        let episodeId = this.episodeCache.byKey.get(episodeKey);

        if (!episodeId) {
          const newEpisode = await tx.episode.create({
            data: {
              seasonId,
              episodeNumber: parsed.episodeNumber,
              title: parsed.episodeTitle,
            },
          });
          episodeId = newEpisode.id;
          this.episodeCache.byKey.set(episodeKey, episodeId);
        } else if (parsed.episodeTitle) {
          // Update title if we have one
          await tx.episode.update({
            where: { id: episodeId },
            data: { title: parsed.episodeTitle },
          });
        }

        // 4. Create or update file
        const existingFile = this.fileCache.byPath.get(file.filepath);
        const fileData = {
          episodeId,
          filepath: file.filepath,
          filename: file.filename,
          fileSize: file.fileSize,
          dateModified: file.dateModified,
          fileExists: true,
          quality: 'UNVERIFIED' as const,
          action: 'NOTHING' as const,
        };

        if (!existingFile) {
          // Create new file
          const newFile = await tx.episodeFile.create({ data: fileData });
          this.fileCache.byPath.set(file.filepath, {
            id: newFile.id,
            fileSize: file.fileSize,
            dateModified: file.dateModified,
            fileExists: true,
          });
          result.filesAdded++;
        } else {
          // Check if file has changed
          const hasChanged =
            existingFile.fileSize !== file.fileSize ||
            existingFile.dateModified.getTime() !== file.dateModified.getTime() ||
            !existingFile.fileExists;

          if (hasChanged) {
            await tx.episodeFile.update({
              where: { id: existingFile.id },
              data: fileData,
            });
            existingFile.fileSize = file.fileSize;
            existingFile.dateModified = file.dateModified;
            existingFile.fileExists = true;
            result.filesUpdated++;
          } else {
            result.filesUnchanged++;
          }
        }
      }
    });

    return result;
  }
}
