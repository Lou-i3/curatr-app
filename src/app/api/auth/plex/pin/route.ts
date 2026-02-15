/**
 * Plex PIN Creation API
 * POST: Creates a new Plex PIN for the auth flow
 * Returns the PIN id and the Plex auth URL for the client to open
 *
 * @swagger
 * /api/auth/plex/pin:
 *   post:
 *     summary: Create a Plex PIN for OAuth flow
 *     description: Creates a new Plex PIN and returns the PIN ID along with the Plex authorization URL for the client to open.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Plex PIN created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pinId:
 *                   type: integer
 *                 authUrl:
 *                   type: string
 *                   format: uri
 *       400:
 *         description: Plex authentication not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error or Plex not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { createPlexPin, isPlexConfigured } from '@/lib/plex/auth';
import { getPlexAuthUrl } from '@/lib/plex/client';
import { getAuthMode } from '@/lib/auth';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const pinRateLimiter = createRateLimiter('auth-pin', {
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 requests per minute
});

export async function POST(request: Request) {
  try {
    // Rate limit PIN creation to prevent abuse
    const { allowed, retryAfterMs } = pinRateLimiter.check(getClientIp(request));
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    if (getAuthMode() !== 'plex') {
      return NextResponse.json(
        { error: 'Plex authentication is not enabled' },
        { status: 400 }
      );
    }

    if (!isPlexConfigured()) {
      return NextResponse.json(
        { error: 'Plex server is not configured. Set PLEX_URL and PLEX_TOKEN environment variables.' },
        { status: 500 }
      );
    }

    const pin = await createPlexPin();
    const authUrl = getPlexAuthUrl(pin.code);

    return NextResponse.json({
      pinId: pin.id,
      authUrl,
    });
  } catch (error) {
    console.error('Failed to create Plex PIN:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Plex authentication' },
      { status: 500 }
    );
  }
}
