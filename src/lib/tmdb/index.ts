/**
 * TMDB integration module
 * Provides API client, types, and utilities for TMDB metadata enrichment
 */

// Config
export { TMDB_CONFIG, isTmdbConfigured } from './config';

// Types
export type {
  TMDBSearchResult,
  TMDBSearchResponse,
  TMDBGenre,
  TMDBNetwork,
  TMDBSeasonSummary,
  TMDBShowDetails,
  TMDBEpisode,
  TMDBSeasonDetails,
  TMDBErrorResponse,
  TMDBMatchResult,
} from './types';

// Client (low-level - prefer service functions for most use cases)
export { TMDBError } from './client';

// Images
export type { PosterSize, BackdropSize, StillSize } from './images';
export { getPosterUrl, getBackdropUrl, getStillUrl } from './images';

// Service (high-level operations)
export {
  searchShows,
  autoMatchShow,
  getShowDetails,
  getSeasonDetails,
  matchShow,
  syncShowSeasons,
  refreshShowMetadata,
  getIntegrationStatus,
  getEnhancedIntegrationStatus,
  getShowsNeedingSync,
  unmatchShow,
} from './service';

export type { EnhancedIntegrationStatus } from './service';
