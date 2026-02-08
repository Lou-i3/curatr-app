/**
 * Authentication utilities (server-side)
 * Handles session management, role checks, and auth mode detection
 */

import { cache } from 'react';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';

export type AuthMode = 'none' | 'plex';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOCAL_ADMIN_PLEX_ID = 'local';

/**
 * Returns the configured authentication mode
 */
export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  if (mode === 'plex') return 'plex';
  return 'none';
}

/**
 * Whether authentication is enabled (not in "none" mode)
 */
export function isAuthEnabled(): boolean {
  return getAuthMode() !== 'none';
}

/**
 * Ensure the Local Admin user exists (seeded on first boot)
 * Follows the same singleton pattern as Settings (id=1)
 */
export async function ensureLocalAdmin(): Promise<User> {
  return prisma.user.upsert({
    where: { plexId: LOCAL_ADMIN_PLEX_ID },
    update: {},
    create: {
      plexId: LOCAL_ADMIN_PLEX_ID,
      username: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
}

/**
 * Get the current session and user from cookies
 * Cached per request — multiple calls in the same request only hit DB once
 * Returns null if no valid session exists
 */
export const getSession = cache(async (): Promise<{ user: User } | null> => {
  // Always call cookies() first to force dynamic rendering.
  // Without this, pages using getSession() could be statically prerendered
  // at build time (when AUTH_MODE is not set), causing stale redirect behavior.
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // cookies() not available during static rendering — return null
    return null;
  }

  // In no-auth mode, return the Local Admin user implicitly
  if (!isAuthEnabled()) {
    try {
      const localAdmin = await ensureLocalAdmin();
      return { user: localAdmin };
    } catch {
      // DB not available (e.g., during build) — return null gracefully
      return null;
    }
  }

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: true },
    });

    if (!session) return null;

    // Check expiry
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: token } }).catch(() => {});
      return null;
    }

    // Check user is still active
    if (!session.user.isActive) return null;

    return { user: session.user };
  } catch {
    // DB not available — return null gracefully
    return null;
  }
});

/**
 * Create a new session for a user
 * @returns The session token to set in a cookie
 */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      id: token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

/**
 * Get session cookie configuration
 */
export function getSessionCookieConfig(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION_MS / 1000, // seconds
    path: '/',
  };
}

/**
 * Get the session cookie name (for middleware and logout)
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * Check admin access for an API route
 * Returns a NextResponse error if not authorized, null if OK
 * Usage: const authError = await checkAdmin(); if (authError) return authError;
 */
export async function checkAdmin(): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check authentication for an API route (any role)
 * Returns a NextResponse error if not authenticated, null if OK
 */
export async function checkAuth(): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return null;
}
