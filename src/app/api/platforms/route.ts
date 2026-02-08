/**
 * Platforms API
 * GET: List all platforms
 * POST: Create new platform
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/auth';

export async function GET() {
  try {
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
