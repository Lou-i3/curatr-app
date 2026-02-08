/**
 * Scanner module type definitions
 */

/** Parsed information extracted from a TV show filename/path */
export interface ParsedFilename {
  showName: string;
  folderName?: string; // Raw folder name on disk (before normalization)
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle?: string;
  year?: number;
  quality?: string;
  source?: string;
}

/** A discovered file on the filesystem */
export interface DiscoveredFile {
  filepath: string;
  filename: string;
  fileSize: bigint;
  dateModified: Date;
}

/** Media metadata extracted from ffprobe */
export interface MediaMetadata {
  codec: string | null;
  resolution: string | null;
  bitrate: number | null;
  container: string | null;
  audioFormat: string | null;
  hdrType: string | null;
  duration: number | null;
  audioLanguages: string[];
  subtitleLanguages: string[];
}

/** Scan progress phases */
export type ScanPhase =
  | 'discovering'
  | 'parsing'
  | 'analyzing'
  | 'saving'
  | 'cleanup'
  | 'complete';

/** Error that occurred during scanning */
export interface ScanError {
  filepath: string;
  error: string;
  phase: ScanPhase | 'fatal';
}

/** Current scan progress state */
export interface ScanProgress {
  scanId: number;
  phase: ScanPhase;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  errors: ScanError[];
}

/** Options for starting a scan */
export interface ScanOptions {
  mediaPath?: string;
  scanType?: 'full' | 'incremental';
  skipMetadata?: boolean;
  concurrency?: number;
  /** Database ID of the show to sync (single-show mode) */
  targetShowId?: number;
  /** Folder name on disk for the target show */
  targetFolderName?: string;
  /** Custom title for task display (e.g., "Scan: Show Name") */
  targetShowTitle?: string;
}

/** Statistics from a completed scan */
export interface ScanStats {
  filesScanned: number;
  filesAdded: number;
  filesUpdated: number;
  filesDeleted: number;
}

/** Result of a scan operation */
export interface ScanResult {
  success: boolean;
  scanId: number;
  stats: ScanStats;
  errors: ScanError[];
}

/** File processing item with all parsed data */
export interface ProcessedFile {
  parsed: ParsedFilename;
  file: DiscoveredFile;
  metadata: MediaMetadata;
}

/** Item ready for batch database processing */
export interface BatchItem {
  parsed: ParsedFilename;
  file: DiscoveredFile;
}

/** Result of batch processing */
export interface BatchResult {
  filesAdded: number;
  filesUpdated: number;
  filesUnchanged: number;
}
