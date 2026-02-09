/**
 * Plex Auth Callback API
 * POST: Checks if a PIN has been claimed and completes the auth flow
 * Creates/updates the user, creates a session, and sets the cookie
 *
 * @swagger
 * /api/auth/plex/callback:
 *   post:
 *     summary: Complete Plex OAuth callback
 *     description: Checks if a Plex PIN has been claimed, validates server access, creates/updates the user, and establishes a session.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pinId]
 *             properties:
 *               pinId:
 *                 type: integer
 *                 description: The Plex PIN ID to check
 *     responses:
 *       200:
 *         description: Auth result — either authenticated with user data, or pending if PIN not yet claimed
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [authenticated]
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         role:
 *                           $ref: '#/components/schemas/UserRole'
 *                         thumbUrl:
 *                           type: string
 *                           nullable: true
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [pending]
 *       400:
 *         description: Missing or invalid pinId, or Plex auth not enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: User not authorized for this Plex server
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
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createSession, getAuthMode, getSessionCookieConfig, isSecureRequest } from '@/lib/auth';
import {
  checkPlexPin,
  getPlexUser,
  validateServerAccess,
  isPlexConfigured,
} from '@/lib/plex/auth';

export async function POST(request: Request) {
  try {
    if (getAuthMode() !== 'plex') {
      return NextResponse.json(
        { error: 'Plex authentication is not enabled' },
        { status: 400 }
      );
    }

    if (!isPlexConfigured()) {
      return NextResponse.json(
        { error: 'Plex server is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { pinId } = body;

    if (!pinId || typeof pinId !== 'number') {
      return NextResponse.json(
        { error: 'PIN ID is required' },
        { status: 400 }
      );
    }

    // Check if PIN has been claimed
    const pinResult = await checkPlexPin(pinId);

    if (!pinResult) {
      // PIN not yet claimed — client should keep polling
      return NextResponse.json({ status: 'pending' });
    }

    // Get the Plex user info
    const plexUser = await getPlexUser(pinResult.authToken);

    // Validate server access and determine role
    const role = await validateServerAccess(pinResult.authToken, plexUser.id);

    if (!role) {
      return NextResponse.json(
        { error: 'You do not have access to this Plex server. Contact the server owner for access.' },
        { status: 403 }
      );
    }

    // Create or update user in our database
    const user = await prisma.user.upsert({
      where: { plexId: String(plexUser.id) },
      update: {
        username: plexUser.username || plexUser.title,
        email: plexUser.email || null,
        thumbUrl: plexUser.thumb || null,
        lastLoginAt: new Date(),
        // Only auto-promote to admin on first login if server owner
        // Don't demote existing admins on subsequent logins
      },
      create: {
        plexId: String(plexUser.id),
        username: plexUser.username || plexUser.title,
        email: plexUser.email || null,
        thumbUrl: plexUser.thumb || null,
        role,
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    // Check if user has been deactivated by admin
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Contact the server admin.' },
        { status: 403 }
      );
    }

    // Create session
    const token = await createSession(user.id);

    // Set session cookie
    const cookieStore = await cookies();
    const cookieConfig = getSessionCookieConfig(token, isSecureRequest(request));
    cookieStore.set(cookieConfig);

    return NextResponse.json({
      status: 'authenticated',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        thumbUrl: user.thumbUrl,
      },
    });
  } catch (error) {
    console.error('Plex auth callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
