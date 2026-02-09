/**
 * Session API
 * GET: Returns the current user session info (for client components)
 *
 * @swagger
 * /api/auth/session:
 *   get:
 *     summary: Get current session info
 *     description: Returns user session data including authentication status, auth mode, and user details. Always returns 200.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session info (authenticated or not)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 authMode:
 *                   type: string
 *                   enum: [none, plex]
 *                 user:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       $ref: '#/components/schemas/UserRole'
 *                     thumbUrl:
 *                       type: string
 *                       nullable: true
 *                     email:
 *                       type: string
 *                       nullable: true
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession, getAuthMode, getSessionCookieName } from '@/lib/auth';

export async function GET() {
  try {
    const authMode = getAuthMode();
    const session = await getSession();

    if (!session) {
      const response = NextResponse.json({
        authenticated: false,
        authMode,
        user: null,
      });

      // Clear stale session cookie — proxy only checks cookie existence,
      // so a stale cookie bypasses the proxy but fails DB validation.
      // Clearing it lets the proxy properly redirect to /login next time.
      if (authMode === 'plex') {
        const cookieStore = await cookies();
        const cookieName = getSessionCookieName();
        if (cookieStore.get(cookieName)) {
          response.cookies.delete(cookieName);
        }
      }

      return response;
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
