/**
 * Platforms API
 * GET: List all platforms
 * POST: Create new platform
 *
 * @swagger
 * /api/platforms:
 *   get:
 *     summary: List all platforms
 *     description: Returns all platforms ordered by sort order, including playback test counts.
 *     tags: [Platforms]
 *     responses:
 *       200:
 *         description: Array of platforms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   isRequired:
 *                     type: boolean
 *                   sortOrder:
 *                     type: integer
 *                   _count:
 *                     type: object
 *                     properties:
 *                       playbackTests:
 *                         type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a platform
 *     description: Creates a new playback testing platform. The platform is appended at the end of the sort order.
 *     tags: [Platforms]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Platform created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 isRequired:
 *                   type: boolean
 *                 sortOrder:
 *                   type: integer
 *       400:
 *         description: Name is required
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
 *       409:
 *         description: Platform with this name already exists
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
import { checkAuth, checkAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const platforms = await prisma.platform.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { playbackTests: true },
        },
      },
    });

    return NextResponse.json(platforms);
  } catch (error) {
    console.error('Failed to fetch platforms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { name, isRequired = false } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Platform name is required' },
        { status: 400 }
      );
    }

    // Get the highest sortOrder to add new platform at the end
    const lastPlatform = await prisma.platform.findFirst({
      orderBy: { sortOrder: 'desc' },
    });
    const sortOrder = (lastPlatform?.sortOrder ?? 0) + 1;

    const platform = await prisma.platform.create({
      data: {
        name: name.trim(),
        isRequired,
        sortOrder,
      },
    });

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A platform with this name already exists' },
        { status: 409 }
      );
    }

    console.error('Failed to create platform:', error);
    return NextResponse.json(
      { error: 'Failed to create platform' },
      { status: 500 }
    );
  }
}
