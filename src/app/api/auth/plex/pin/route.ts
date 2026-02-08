/**
 * Plex PIN Creation API
 * POST: Creates a new Plex PIN for the auth flow
 * Returns the PIN id and the Plex auth URL for the client to open
 */

import { NextResponse } from 'next/server';
import { createPlexPin, isPlexConfigured } from '@/lib/plex/auth';
import { getPlexAuthUrl } from '@/lib/plex/client';
import { getAuthMode } from '@/lib/auth';

export async function POST() {
  try {
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
