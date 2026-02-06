/**
 * TMDB API client with rate limiting
 * Handles authentication, rate limiting, and error handling for TMDB API calls
 */

import { TMDB_CONFIG, isTmdbConfigured } from './config';
import type {
  TMDBSearchResponse,
  TMDBShowDetails,
  TMDBSeasonDetails,
  TMDBErrorResponse,
  TMDBEpisodeGroupsResponse,
  TMDBEpisodeGroupDetails,
} from './types';

/** Rate limiter to respect TMDB's 40 requests per 10 seconds limit */
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Wait if necessary to respect rate limit, then record the request */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate wait time until oldest request expires
      const oldestTimestamp = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestTimestamp) + 10; // +10ms buffer

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // Clean up again after waiting
      this.timestamps = this.timestamps.filter((t) => Date.now() - t < this.windowMs);
    }

    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(
  TMDB_CONFIG.rateLimit.maxRequests,
  TMDB_CONFIG.rateLimit.windowMs
);

/** Custom error for TMDB API errors */
export class TMDBError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public tmdbCode?: number
  ) {
    super(message);
    this.name = 'TMDBError';
  }
}

/**
 * Make an authenticated request to the TMDB API
 * Handles rate limiting, authentication, and error responses
 */
async function tmdbFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!isTmdbConfigured()) {
    throw new TMDBError('TMDB API key not configured', 401);
  }

  await rateLimiter.acquire();

  const url = new URL(`${TMDB_CONFIG.apiBaseUrl}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TMDB_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `TMDB API error: ${response.status}`;
    let tmdbCode: number | undefined;

    try {
      const errorData = (await response.json()) as TMDBErrorResponse;
      errorMessage = errorData.status_message || errorMessage;
      tmdbCode = errorData.status_code;
    } catch {
      // Ignore JSON parse errors for error response
    }

    throw new TMDBError(errorMessage, response.status, tmdbCode);
  }

  return response.json() as Promise<T>;
}

/**
 * Search for TV shows by title
 * @param query - Search query (show title)
 * @param year - Optional first air date year filter
 * @param page - Page number (default 1)
 */
export async function searchTVShows(
  query: string,
  year?: number,
  page = 1
): Promise<TMDBSearchResponse> {
  const params: Record<string, string> = {
    query,
    page: page.toString(),
    include_adult: 'false',
  };

  if (year) {
    params.first_air_date_year = year.toString();
  }

  return tmdbFetch<TMDBSearchResponse>('/search/tv', params);
}

/**
 * Get detailed information about a TV show
 * @param tmdbId - TMDB show ID
 */
export async function getTVShowDetails(tmdbId: number): Promise<TMDBShowDetails> {
  return tmdbFetch<TMDBShowDetails>(`/tv/${tmdbId}`);
}

/**
 * Get detailed information about a season including all episodes
 * @param tmdbId - TMDB show ID
 * @param seasonNumber - Season number (0 for specials)
 */
export async function getSeasonDetails(
  tmdbId: number,
  seasonNumber: number
): Promise<TMDBSeasonDetails> {
  return tmdbFetch<TMDBSeasonDetails>(`/tv/${tmdbId}/season/${seasonNumber}`);
}

/**
 * Get available episode groups (alternative orderings) for a TV show
 * @param tmdbId - TMDB show ID
 */
export async function getEpisodeGroups(tmdbId: number): Promise<TMDBEpisodeGroupsResponse> {
  return tmdbFetch<TMDBEpisodeGroupsResponse>(`/tv/${tmdbId}/episode_groups`);
}

/**
 * Get detailed information about a specific episode group
 * @param groupId - Episode group ID (string format)
 */
export async function getEpisodeGroupDetails(groupId: string): Promise<TMDBEpisodeGroupDetails> {
  return tmdbFetch<TMDBEpisodeGroupDetails>(`/tv/episode_group/${groupId}`);
}
