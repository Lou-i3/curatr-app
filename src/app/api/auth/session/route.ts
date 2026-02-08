/**
 * Session API
 * GET: Returns the current user session info (for client components)
 */

import { NextResponse } from 'next/server';
import { getSession, getAuthMode } from '@/lib/auth';

export async function GET() {
  try {
    const authMode = getAuthMode();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        authMode,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      authMode,
      user: {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        thumbUrl: session.user.thumbUrl,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
}
