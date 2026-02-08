/**
 * FFprobe service module
 * High-level operations for media analysis and database updates
 */

import { prisma } from '@/lib/prisma';
import { extractMediaInfo } from './extract';
import { isFFprobeAvailable, getFFprobeDetailedStatus } from './config';
import type { ExtractionResult } from './types';
import type { TrackType } from '@/generated/prisma/client';

/**
 * Extract media info and save to database for a single file
 * @param fileId - The EpisodeFile ID to analyze
 * @returns The extraction result
 * @throws Error if file not found, doesn't exist on disk, or ffprobe fails
 */
export async function analyzeAndSaveMediaInfo(fileId: number): Promise<ExtractionResult> {
  // Get file from database
  const file = await prisma.episodeFile.findUnique({
    where: { id: fileId },
    select: { id: true, filepath: true, fileExists: true },
  });

  if (!file) {
    throw new Error(`File not found in database: ${fileId}`);
  }

  if (!file.fileExists) {
    throw new Error(`File no longer exists on disk: ${file.filepath}`);
  }

  // Check if ffprobe is available
  if (!(await isFFprobeAvailable())) {
    throw new Error(
      'FFprobe is not available. Please configure FFPROBE_PATH environment variable.'
    );
  }

  try {
    // Extract media info
    const result = await extractMediaInfo(file.filepath);

    // Update database in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing tracks for this file
      await tx.mediaTrack.deleteMany({
        where: { episodeFileId: fileId },
      });

      // Update file with summary data
      await tx.episodeFile.update({
        where: { id: fileId },
        data: {
          codec: result.summary.codec,
          resolution: result.summary.resolution,
          bitrate: result.summary.bitrate,
          container: result.summary.container,
          audioFormat: result.summary.audioFormat,
          hdrType: result.summary.hdrType,
          duration: result.summary.duration,
          audioLanguages: JSON.stringify(result.summary.audioLanguages),
          subtitleLanguages: JSON.stringify(result.summary.subtitleLanguages),
          metadataSource: 'ffprobe',
          mediaInfoExtractedAt: new Date(),
          mediaInfoError: null,
        },
      });

      // Create new tracks
      if (result.tracks.length > 0) {
        await tx.mediaTrack.createMany({
          data: result.tracks.map((track) => ({
            episodeFileId: fileId,
            trackType: track.trackType as TrackType,
            trackIndex: track.trackIndex,
            codec: track.codec,
            codecLong: track.codecLong,
            width: track.width,
            height: track.height,
            bitDepth: track.bitDepth,
            frameRate: track.frameRate,
            hdrType: track.hdrType,
            profile: track.profile,
            channels: track.channels,
            channelLayout: track.channelLayout,
            sampleRate: track.sampleRate,
            language: track.language,
            title: track.title,
            bitrate: track.bitrate,
            isDefault: track.isDefault,
            isForced: track.isForced,
          })),
        });
      }
    });

    return result;
  } catch (error) {
    // Record the error in the database
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.episodeFile.update({
      where: { id: fileId },
      data: {
        mediaInfoExtractedAt: new Date(),
        mediaInfoError: errorMessage,
      },
    });
    throw error;
  }
}

/**
 * Get FFprobe integration status and statistics
 */
export async function getFFprobeStatus(): Promise<{
  configured: boolean;
  available: boolean;
  version: string | null;
  path: string;
  error: string | null;
  files: {
    total: number;
    analyzed: number;
    failed: number;
    pending: number;
  };
}> {
  const detailedStatus = await getFFprobeDetailedStatus();

  // Get file statistics
  const [totalFiles, analyzedFiles, failedFiles] = await Promise.all([
    prisma.episodeFile.count({ where: { fileExists: true } }),
    prisma.episodeFile.count({
      where: {
        fileExists: true,
        mediaInfoExtractedAt: { not: null },
        mediaInfoError: null,
      },
    }),
    prisma.episodeFile.count({
      where: {
        fileExists: true,
        mediaInfoError: { not: null },
      },
    }),
  ]);

  return {
    configured: detailedStatus.configured,
    available: detailedStatus.available,
    version: detailedStatus.version,
    path: detailedStatus.path,
    error: detailedStatus.error,
    files: {
      total: totalFiles,
      analyzed: analyzedFiles,
      failed: failedFiles,
      pending: totalFiles - analyzedFiles - failedFiles,
    },
  };
}

/**
 * Get detailed track information for a file
 */
export async function getFileTracks(fileId: number) {
  return prisma.mediaTrack.findMany({
    where: { episodeFileId: fileId },
    orderBy: { trackIndex: 'asc' },
  });
}
