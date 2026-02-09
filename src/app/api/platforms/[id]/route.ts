/**
 * Platform CRUD API
 * GET: Get single platform
 * PATCH: Update platform
 * DELETE: Delete platform
 *
 * @swagger
 * /api/platforms/{id}:
 *   get:
 *     summary: Get platform details
 *     description: Returns a single platform by ID, including playback test count.
 *     tags: [Platforms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Platform ID
 *     responses:
 *       200:
 *         description: Platform details
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
 *                 _count:
 *                   type: object
 *                   properties:
 *                     playbackTests:
 *                       type: integer
 *       400:
 *         description: Invalid platform ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Platform not found
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
 *   patch:
 *     summary: Update a platform
 *     description: Updates platform fields. Only provided fields are changed.
 *     tags: [Platforms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Platform ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated platform
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
 *         description: Invalid ID or empty name
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
 *   delete:
 *     summary: Delete a platform
 *     description: Deletes a platform. Fails if the platform has playback tests attached.
 *     tags: [Platforms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Platform ID
 *     responses:
 *       200:
 *         description: Platform deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid platform ID
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
 *         description: Cannot delete platform with existing tests
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const platformId = parseInt(id, 10);

    if (isNaN(platformId)) {
      return NextResponse.json({ error: 'Invalid platform ID' }, { status: 400 });
    }

    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      include: {
        _count: {
          select: { playbackTests: true },
        },
      },
    });

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    return NextResponse.json(platform);
  } catch (error) {
    console.error('Failed to fetch platform:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const platformId = parseInt(id, 10);

    if (isNaN(platformId)) {
      return NextResponse.json({ error: 'Invalid platform ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, isRequired, sortOrder } = body;

    // Build update data
    const updateData: {
      name?: string;
      isRequired?: boolean;
      sortOrder?: number;
    } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Platform name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (isRequired !== undefined) {
      updateData.isRequired = Boolean(isRequired);
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder);
    }

    const platform = await prisma.platform.update({
      where: { id: platformId },
      data: updateData,
    });

    return NextResponse.json(platform);
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A platform with this name already exists' },
        { status: 409 }
      );
    }

    console.error('Failed to update platform:', error);
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const platformId = parseInt(id, 10);

    if (isNaN(platformId)) {
      return NextResponse.json({ error: 'Invalid platform ID' }, { status: 400 });
    }

    // Check if platform has any tests
    const testCount = await prisma.playbackTest.count({
      where: { platformId },
    });

    if (testCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete platform with existing tests',
          testCount,
        },
        { status: 409 }
      );
    }

    await prisma.platform.delete({
      where: { id: platformId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete platform:', error);
    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    );
  }
}
