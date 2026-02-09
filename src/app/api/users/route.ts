/**
 * Users API
 * GET: List all users (admin only)
 *
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     description: Returns all users with their profile info, role, activity status, and reported issue count. Admin only.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   plexId:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                     nullable: true
 *                   thumbUrl:
 *                     type: string
 *                     nullable: true
 *                   role:
 *                     $ref: '#/components/schemas/UserRole'
 *                   isActive:
 *                     type: boolean
 *                   lastLoginAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   _count:
 *                     type: object
 *                     properties:
 *                       reportedIssues:
 *                         type: integer
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plexId: true,
        username: true,
        email: true,
        thumbUrl: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            reportedIssues: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
