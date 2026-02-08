/**
 * FFprobe module
 * Media file analysis using FFprobe
 */

// Configuration
export {
  getFFprobeConfig,
  isFFprobeConfigured,
  isFFprobeAvailable,
  getFFprobeVersion,
  getFFprobeDetailedStatus,
} from './config';

// Extraction
export { extractMediaInfo, runFFprobe } from './extract';

// Service operations
export { analyzeAndSaveMediaInfo, getFFprobeStatus, getFileTracks } from './service';

// Types
export type {
  FFprobeConfig,
} from './config';

export type {
  FFprobeOutput,
  FFprobeFormat,
  FFprobeStream,
  FFprobeDisposition,
  FFprobeSideData,
  NormalizedTrack,
  MediaSummary,
  ExtractionResult,
} from './types';
