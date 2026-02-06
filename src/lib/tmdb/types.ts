/**
 * TypeScript types for TMDB API responses
 * Based on TMDB API v3: https://developer.themoviedb.org/reference
 */

/** Search result for a TV show */
export interface TMDBSearchResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string; // "YYYY-MM-DD"
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
}

/** Search response wrapper */
export interface TMDBSearchResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

/** Genre object */
export interface TMDBGenre {
  id: number;
  name: string;
}

/** Network (broadcaster) */
export interface TMDBNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

/** Season summary (from show details) */
export interface TMDBSeasonSummary {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  season_number: number;
  episode_count: number;
  vote_average: number;
}

/** Full TV show details */
export interface TMDBShowDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TMDBGenre[];
  networks: TMDBNetwork[];
  origin_country: string[];
  original_language: string;
  status: string; // "Returning Series", "Ended", "Canceled", etc.
  type: string; // "Scripted", "Documentary", etc.
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TMDBSeasonSummary[];
  homepage: string | null;
  in_production: boolean;
  tagline: string;
}

/** Episode details */
export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  production_code: string;
}

/** Full season details with episodes */
export interface TMDBSeasonDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  season_number: number;
  episodes: TMDBEpisode[];
  vote_average: number;
}

/** Error response from TMDB API */
export interface TMDBErrorResponse {
  success: false;
  status_code: number;
  status_message: string;
}

// ============================================
// Episode Groups (Alternative Orderings)
// ============================================

/** Episode group types from TMDB */
export type TMDBEpisodeGroupType =
  | 1  // Original air date
  | 2  // Absolute
  | 3  // DVD
  | 4  // Digital
  | 5  // Story arc
  | 6  // Production
  | 7; // TV

/** Episode group type labels */
export const EPISODE_GROUP_TYPE_LABELS: Record<TMDBEpisodeGroupType, string> = {
  1: 'Original Air Date',
  2: 'Absolute',
  3: 'DVD',
  4: 'Digital',
  5: 'Story Arc',
  6: 'Production',
  7: 'TV',
};

/** Summary of an episode group (from list endpoint) */
export interface TMDBEpisodeGroupSummary {
  id: string;
  name: string;
  description: string;
  type: TMDBEpisodeGroupType;
  episode_count: number;
  group_count: number;
  network?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  } | null;
}

/** Episode groups list response */
export interface TMDBEpisodeGroupsResponse {
  id: number;
  results: TMDBEpisodeGroupSummary[];
}

/** Episode within an episode group */
export interface TMDBEpisodeGroupEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  order: number;
}

/** Group (like a season) within an episode group */
export interface TMDBEpisodeGroupGroup {
  id: string;
  name: string;
  order: number;
  locked: boolean;
  episodes: TMDBEpisodeGroupEpisode[];
}

/** Full episode group details */
export interface TMDBEpisodeGroupDetails {
  id: string;
  name: string;
  description: string;
  type: TMDBEpisodeGroupType;
  episode_count: number;
  group_count: number;
  groups: TMDBEpisodeGroupGroup[];
  network?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  } | null;
}

/** Our internal match result with confidence score */
export interface TMDBMatchResult {
  tmdbShow: TMDBSearchResult;
  confidence: number; // 0-100
  matchReasons: string[];
}

// ============================================
// Import Preview Types
// ============================================

/** Episode in import preview with existing DB match info */
export interface ImportPreviewEpisode {
  tmdbEpisodeId: number;
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number;
  // Match info
  existingEpisodeId: number | null;
  hasFiles: boolean;
}

/** Season in import preview with existing DB match info */
export interface ImportPreviewSeason {
  tmdbSeasonId: number;
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  posterPath: string | null;
  episodeCount: number;
  // Match info
  existingSeasonId: number | null;
  episodes: ImportPreviewEpisode[];
}

/** Episode group option for import preview */
export interface EpisodeGroupOption {
  id: string;
  name: string;
  description: string;
  type: TMDBEpisodeGroupType;
  typeLabel: string;
  episodeCount: number;
  groupCount: number;
}

/** Full import preview response */
export interface ImportPreviewResponse {
  show: {
    id: number;
    title: string;
    tmdbId: number;
  };
  seasons: ImportPreviewSeason[];
  /** Available episode groups (alternative orderings) */
  episodeGroups: EpisodeGroupOption[];
}

/** Episode data for import request */
export interface ImportEpisodeItem {
  episodeNumber: number;
  title: string;
  tmdbEpisodeId: number;
  airDate: string | null;
  stillPath: string | null;
  description: string | null;
  runtime: number | null;
  voteAverage: number | null;
  status: 'MISSING' | 'UNWANTED';
}

/** Season data for import request */
export interface ImportSeasonItem {
  seasonNumber: number;
  name: string;
  tmdbSeasonId: number;
  airDate: string | null;
  posterPath: string | null;
  description: string | null;
  episodes: ImportEpisodeItem[];
}

/** Import request body */
export interface ImportRequest {
  showId: number;
  items: ImportSeasonItem[];
}

/** Import result */
export interface ImportResult {
  seasonsCreated: number;
  seasonsUpdated: number;
  episodesCreated: number;
  episodesUpdated: number;
}
