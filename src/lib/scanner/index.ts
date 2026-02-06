/**
 * Scanner module - main entry point
 *
 * This module provides functionality to scan TV show directories,
 * parse filenames, extract metadata via ffprobe, and populate the database.
 */

export * from './types';
export * from './config';
export * from './filesystem';
export * from './parser';
export * from './database';
export * from './progress';
export { startScan, cancelScan, isScanActive, getScanProgress } from './scan';
export type { StartScanResult } from './scan';
