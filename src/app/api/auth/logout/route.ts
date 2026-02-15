/**
 * Logout API
 * POST: Destroys the session and clears the cookie
 *
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out current session
 *     description: Destroys the current session and clears the session cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, getSessionCookieName, isSecureRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const cookieName = getSessionCookieName();
    const token = cookieStore.get(cookieName)?.value;

    if (token) {
      await deleteSession(token);
    }

    // Clear the cookie — use isSecureRequest() for consistency with login
    cookieStore.set(cookieName, '', {
      httpOnly: true,
      secure: isSecureRequest(request),
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
