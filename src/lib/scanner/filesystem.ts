/**
 * Filesystem module - discovers video files in media directories
 */

import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import type { DiscoveredFile } from './types';

/** Supported video file extensions */
export const VIDEO_EXTENSIONS = new Set([
  '.mkv',
  '.mp4',
  '.avi',
  '.m4v',
  '.ts',
  '.wmv',
  '.mov',
  '.webm',
  '.flv',
  '.mpg',
  '.mpeg',
]);

/**
 * Check if a file has a video extension
 */
export function isVideoFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Recursively discover all video files in a directory
 * Uses an async generator for memory efficiency with large libraries
 *
 * @param mediaPath - Root directory to scan
 * @yields DiscoveredFile objects for each video file found
 */
export async function* discoverFiles(
  mediaPath: string
): AsyncGenerator<DiscoveredFile> {
  const queue: string[] = [mediaPath];

  while (queue.length > 0) {
    const currentPath = queue.shift()!;

    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip directories we can't read (permissions, etc.)
      console.warn(`Cannot read directory: ${currentPath}`, error);
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      // Skip hidden files and directories
      if (entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        // Add subdirectory to queue for processing
        queue.push(fullPath);
      } else if (entry.isFile() && isVideoFile(entry.name)) {
        // Found a video file
        try {
          const fileStat = await stat(fullPath);
          yield {
            filepath: fullPath,
            filename: entry.name,
            fileSize: BigInt(fileStat.size),
            dateModified: fileStat.mtime,
          };
        } catch (error) {
          console.warn(`Cannot stat file: ${fullPath}`, error);
          continue;
        }
      }
    }
  }
}

/**
 * Count total video files in a directory (for progress tracking)
 * This is a quick preliminary count before full scanning
 *
 * @param mediaPath - Root directory to count
 * @returns Total number of video files
 */
export async function countVideoFiles(mediaPath: string): Promise<number> {
  let count = 0;
  for await (const _ of discoverFiles(mediaPath)) {
    count++;
  }
  return count;
}
