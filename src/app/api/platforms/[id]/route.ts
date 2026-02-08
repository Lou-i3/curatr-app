/**
 * Platform CRUD API
 * GET: Get single platform
 * PATCH: Update platform
 * DELETE: Delete platform
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
