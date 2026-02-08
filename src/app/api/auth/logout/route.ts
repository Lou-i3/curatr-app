/**
 * Logout API
 * POST: Destroys the session and clears the cookie
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, getSessionCookieName } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const cookieName = getSessionCookieName();
    const token = cookieStore.get(cookieName)?.value;

    if (token) {
      await deleteSession(token);
    }

    // Clear the cookie
    cookieStore.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
