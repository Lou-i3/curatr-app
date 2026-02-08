/**
 * Parser module - extracts TV show information from file paths
 *
 * Supports multiple naming conventions:
 * 1. Plex-style: /TV Shows/Show Name (2020)/Season 01/Show Name - S01E05 - Episode Title.mkv
 * 2. Plex Specials: /TV Shows/Show Name (2020)/Specials/Show Name - S00E01 - Special.mkv
 * 3. Standard SxxExx: Show.Name.S01E05.Episode.Title.1080p.mkv
 * 4. Alternative XxYY: Show Name 1x05.mkv
 */

import { basename, dirname, sep } from 'path';
import type { ParsedFilename } from './types';

/**
 * Normalize a show name for consistent matching
 * - Replaces dots/underscores with spaces
 * - Removes trailing/leading dashes and hyphens
 * - Collapses multiple spaces
 * - Trims whitespace
 */
export function normalizeShowName(name: string): string {
  return name
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '') // Remove leading/trailing dashes and spaces
    .trim();
}

/**
 * Generate a key for matching show names
 * Used to find existing shows in the database
 */
export function showNameMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if a folder name is a season folder and extract the season number
 * Supports: "Season XX", "Season X", "Specials" (returns 0)
 */
function parseSeasonFolder(folderName: string): number | null {
  // Check for "Specials" folder (Season 0)
  if (/^Specials$/i.test(folderName)) {
    return 0;
  }

  // Check for "Season XX" pattern
  const seasonMatch = folderName.match(/^Season\s+(\d+)$/i);
  if (seasonMatch) {
    return parseInt(seasonMatch[1], 10);
  }

  return null;
}

/**
 * Try to parse Plex-style directory structure
 * Expected: /media/TV Shows/Show Name (Year)/Season XX/filename.ext
 * Also supports: /media/TV Shows/Show Name (Year)/Specials/filename.ext
 */
function parsePlexStyle(filepath: string): ParsedFilename | null {
  const parts = filepath.split(sep);

  // Find season directory (Season XX or Specials)
  const seasonIdx = parts.findIndex((p) => parseSeasonFolder(p) !== null);
  if (seasonIdx === -1 || seasonIdx < 1) {
    return null;
  }

  const showDir = parts[seasonIdx - 1];
  const seasonDir = parts[seasonIdx];
  const filename = parts[parts.length - 1];

  // Extract show name and optional year from directory
  // Matches: "Show Name (2020)" or "Show Name"
  const showMatch = showDir.match(/^(.+?)(?:\s*\((\d{4})\))?$/);
  if (!showMatch) {
    return null;
  }

  // Extract season number (parseSeasonFolder already validated this)
  const seasonNumber = parseSeasonFolder(seasonDir);
  if (seasonNumber === null) {
    return null;
  }

  // Extract episode number from filename
  const episodeNumber = extractEpisodeNumber(filename);
  if (episodeNumber === null) {
    return null;
  }

  // Try to extract episode title from filename
  const episodeTitle = extractEpisodeTitle(filename);

  return {
    showName: normalizeShowName(showMatch[1]),
    folderName: showDir, // Raw folder name on disk
    year: showMatch[2] ? parseInt(showMatch[2], 10) : undefined,
    seasonNumber,
    episodeNumber,
    episodeTitle,
  };
}

/**
 * Try to extract show name from folder structure
 * Looks for "Show Name (Year)" folder above "Season XX" or "Specials" folder
 * Returns both the normalized name and the raw folder name
 */
function getShowNameFromFolder(filepath: string): { name: string; folderName: string; year?: number } | null {
  const parts = filepath.split(sep);

  // Find season directory (Season XX or Specials)
  const seasonIdx = parts.findIndex((p) => parseSeasonFolder(p) !== null);
  if (seasonIdx > 0) {
    const showDir = parts[seasonIdx - 1];
    const showMatch = showDir.match(/^(.+?)(?:\s*\((\d{4})\))?$/);
    if (showMatch) {
      return {
        name: normalizeShowName(showMatch[1]),
        folderName: showDir, // Raw folder name including year if present
        year: showMatch[2] ? parseInt(showMatch[2], 10) : undefined,
      };
    }
  }

  return null;
}

/**
 * Try to parse SxxExx pattern from filename
 * Examples:
 * - Show.Name.S01E05.Episode.Title.1080p.mkv
 * - show_name_s01e05_720p.mkv
 */
function parseSxxExx(filepath: string): ParsedFilename | null {
  const filename = basename(filepath);

  // Match SxxExx pattern (case insensitive)
  const match = filename.match(/[sS](\d{1,2})[eE](\d{1,3})/);
  if (!match) {
    return null;
  }

  const seasonNumber = parseInt(match[1], 10);
  const episodeNumber = parseInt(match[2], 10);

  // First, try to get show name from folder structure (most reliable)
  const folderInfo = getShowNameFromFolder(filepath);
  if (folderInfo) {
    return {
      showName: folderInfo.name,
      folderName: folderInfo.folderName,
      year: folderInfo.year,
      seasonNumber,
      episodeNumber,
      episodeTitle: extractEpisodeTitle(filename),
    };
  }

  // Fall back to extracting from filename (everything before the SxxExx pattern)
  const showNamePart = filename.substring(0, match.index);
  const showName = normalizeShowName(showNamePart);

  if (!showName) {
    // Try to get show name from parent directory (if not a season folder)
    const parentDir = basename(dirname(filepath));
    if (parentDir && parseSeasonFolder(parentDir) === null) {
      return {
        showName: normalizeShowName(parentDir.replace(/\s*\(\d{4}\)$/, '')),
        seasonNumber,
        episodeNumber,
        episodeTitle: extractEpisodeTitle(filename),
      };
    }
    return null;
  }

  // Check if there's a year in the show name
  const yearMatch = showName.match(/^(.+?)\s*(\d{4})$/);

  return {
    showName: yearMatch ? yearMatch[1].trim() : showName,
    year: yearMatch ? parseInt(yearMatch[2], 10) : undefined,
    seasonNumber,
    episodeNumber,
    episodeTitle: extractEpisodeTitle(filename),
  };
}

/**
 * Try to parse XxYY pattern (e.g., "Show Name 1x05.mkv")
 */
function parseXxYY(filepath: string): ParsedFilename | null {
  const filename = basename(filepath);

  // Match XxYY pattern
  const match = filename.match(/(\d{1,2})x(\d{1,2})/i);
  if (!match) {
    return null;
  }

  const seasonNumber = parseInt(match[1], 10);
  const episodeNumber = parseInt(match[2], 10);

  // Extract show name (everything before the XxYY pattern)
  const showNamePart = filename.substring(0, match.index);
  const showName = normalizeShowName(showNamePart);

  if (!showName) {
    return null;
  }

  return {
    showName,
    seasonNumber,
    episodeNumber,
  };
}

/**
 * Extract episode number from a filename
 * Tries multiple patterns
 */
function extractEpisodeNumber(filename: string): number | null {
  // Try SxxExx first
  const sxxexx = filename.match(/[sS]\d{1,2}[eE](\d{1,3})/);
  if (sxxexx) {
    return parseInt(sxxexx[1], 10);
  }

  // Try standalone E## (e.g., "E05")
  const eOnly = filename.match(/[eE](\d{1,3})/);
  if (eOnly) {
    return parseInt(eOnly[1], 10);
  }

  // Try - ## - pattern (e.g., "Show Name - 05 - Episode Title.mkv")
  const dashNum = filename.match(/\s-\s(\d{1,2})\s-\s/);
  if (dashNum) {
    return parseInt(dashNum[1], 10);
  }

  // Try XxYY pattern
  const xPattern = filename.match(/\d{1,2}x(\d{1,2})/i);
  if (xPattern) {
    return parseInt(xPattern[1], 10);
  }

  return null;
}

/**
 * Quality patterns to strip from episode titles
 * Matches: 1080p, 720p, BluRay, Bluray-1080p, HDTV, WEB-DL, etc.
 */
const QUALITY_PATTERN =
  /\s*[-.]?\s*(?:(?:BluRay|Blu-Ray|Bluray|HDTV|WEB[-.]?DL|WEB[-.]?Rip|WEB|DVDRip|BDRip|BRRip)[-.]?)?(?:\d{3,4}p)?(?:[-.]?(?:BluRay|Blu-Ray|Bluray|HDTV|WEB[-.]?DL|WEB[-.]?Rip|WEB|DVDRip|BDRip|BRRip|x264|x265|HEVC|H\.?264|H\.?265|AAC|AC3|DTS|10bit|HDR|SDR))*\s*$/i;

/**
 * Strip quality info from the end of a title
 * Examples:
 * - "Episode Title 1080p" -> "Episode Title"
 * - "Episode Title BluRay-1080p" -> "Episode Title"
 * - "Episode Title HDTV" -> "Episode Title"
 */
function stripQualityFromTitle(title: string): string {
  return title.replace(QUALITY_PATTERN, '').trim();
}

/**
 * Try to extract episode title from filename
 * Looks for patterns like "S01E05 - Episode Title" or "S01E05.Episode.Title"
 * Strips quality info (1080p, BluRay, etc.) from the end of titles
 */
function extractEpisodeTitle(filename: string): string | undefined {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Try "- Episode Title" pattern after SxxExx
  const dashPattern = nameWithoutExt.match(
    /[sS]\d{1,2}[eE]\d{1,3}\s*-\s*(.+?)(?:\s*-\s*|\s*\[|\s*$)/
  );
  if (dashPattern && dashPattern[1]) {
    const rawTitle = dashPattern[1].trim();
    const title = stripQualityFromTitle(rawTitle);
    // Don't return if it's only quality info
    if (title && !title.match(/^\d{3,4}p$/i) && !title.match(/^(HDTV|WEB|BluRay)/i)) {
      return title;
    }
  }

  // Try extracting from dot-separated format after SxxExx
  const dotPattern = nameWithoutExt.match(
    /[sS]\d{1,2}[eE]\d{1,3}\.([A-Za-z][A-Za-z0-9.]+?)\.(?:\d{3,4}p|HDTV|WEB|BluRay|x264|x265|HEVC)/i
  );
  if (dotPattern && dotPattern[1]) {
    return normalizeShowName(dotPattern[1]);
  }

  return undefined;
}

/**
 * Main parsing function - tries all parsing strategies
 *
 * @param filepath - Full path to the video file
 * @returns ParsedFilename or null if parsing failed
 */
export function parseFilename(filepath: string): ParsedFilename | null {
  // Try Plex-style first (most reliable when directory structure is present)
  const plexResult = parsePlexStyle(filepath);
  if (plexResult) {
    return plexResult;
  }

  // Try SxxExx pattern
  const sxxexxResult = parseSxxExx(filepath);
  if (sxxexxResult) {
    return sxxexxResult;
  }

  // Try XxYY pattern
  const xResult = parseXxYY(filepath);
  if (xResult) {
    return xResult;
  }

  // Unable to parse
  return null;
}
