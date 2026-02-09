/**
 * Single User API
 * PATCH: Update user role or active status (admin only)
 *
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user role or status
 *     description: Updates a user's role or active status. Admin only. Cannot modify own account or the system admin.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 $ref: '#/components/schemas/UserRole'
 *               isActive:
 *                 type: boolean
 *                 description: Whether the user account is active. Deactivating deletes all sessions.
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 role:
 *                   $ref: '#/components/schemas/UserRole'
 *                 isActive:
 *                   type: boolean
 *       400:
 *         description: Validation error (invalid role, self-modification, system admin, or no fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
import { prisma } from '@/lib/prisma';
import { checkAdmin, getSession } from '@/lib/auth';
import type { UserRole } from '@/generated/prisma/client';

const VALID_ROLES: UserRole[] = ['ADMIN', 'USER'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent self-modification of role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot modify your own account from here' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent modifying the seeded local admin
    if (user.plexId === 'local') {
      return NextResponse.json(
        { error: 'Cannot modify the system admin account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      data.role = body.role;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
      }
      data.isActive = body.isActive;

      // If deactivating, also delete their sessions to force logout
      if (!body.isActive) {
        await prisma.session.deleteMany({ where: { userId } });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
