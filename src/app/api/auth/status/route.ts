/**
 * Auth Status API — returns current authentication configuration and stats
 * Used by the Plex Auth integration page
 *
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Get auth mode status
 *     description: Returns current authentication configuration including auth mode, Plex config status, and server connectivity.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Auth status info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authMode:
 *                   type: string
 *                   enum: [none, plex]
 *                 plexConfigured:
 *                   type: boolean
 *                 plexUrl:
 *                   type: string
 *                   nullable: true
 *                 serverReachable:
 *                   type: boolean
 *                 users:
 *                   type: integer
 *                 activeSessions:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthMode } from '@/lib/auth';
import { isPlexConfigured, getPlexUrl } from '@/lib/plex/auth';

export async function GET() {
  try {
    const authMode = getAuthMode();
    const plexConfigured = isPlexConfigured();
    const plexUrl = getPlexUrl();

    let userCount = 0;
    let activeSessionCount = 0;
    let serverReachable = false;

    if (plexConfigured) {
      [userCount, activeSessionCount] = await Promise.all([
        prisma.user.count({ where: { plexId: { not: 'local' } } }),
        prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      ]);

      // Quick connectivity check to the Plex server
      if (plexUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(`${plexUrl}/identity`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          serverReachable = response.ok;
        } catch {
          serverReachable = false;
        }
      }
    }

    return NextResponse.json({
      authMode,
      plexConfigured,
      plexUrl: plexUrl ? plexUrl.replace(/\/+$/, '') : null,
      serverReachable,
      users: userCount,
      activeSessions: activeSessionCount,
    });
  } catch (error) {
    console.error('Failed to fetch auth status:', error);
    return NextResponse.json({ error: 'Failed to fetch auth status' }, { status: 500 });
  }
}
