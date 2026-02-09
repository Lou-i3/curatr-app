/**
 * TMDB search API route
 * GET /api/tmdb/search?q=title&year=2020
 *
 * @swagger
 * /api/tmdb/search:
 *   get:
 *     summary: Search TMDB for TV shows
 *     description: Searches The Movie Database for TV shows matching the provided query string, with an optional year filter.
 *     tags: [TMDB]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1900
 *           maximum: 2100
 *         description: Optional year filter for narrowing results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing or invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: TMDB not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { searchShows, TMDBError, isTmdbConfigured } from '@/lib/tmdb';

export async function GET(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const yearParam = searchParams.get('year');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  if (yearParam && (isNaN(year!) || year! < 1900 || year! > 2100)) {
    return NextResponse.json(
      { error: 'Invalid year parameter' },
      { status: 400 }
    );
  }

  try {
    const results = await searchShows(query, year);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof TMDBError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('TMDB search error:', error);
    return NextResponse.json(
      { error: 'Failed to search TMDB' },
      { status: 500 }
    );
  }
}
