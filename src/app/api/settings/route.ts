import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setMaxParallelTasks } from '@/lib/tasks';

const VALID_DATE_FORMATS = ['EU', 'US', 'ISO'];

export async function GET() {
  try {
    // Get or create settings with default values
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    // Sync in-memory task queue limit (ensures it's loaded from DB on first access)
    setMaxParallelTasks(settings.maxParallelTasks);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateFormat, maxParallelTasks } = body;

    const updateData: { dateFormat?: string; maxParallelTasks?: number } = {};

    if (dateFormat !== undefined) {
      if (!VALID_DATE_FORMATS.includes(dateFormat)) {
        return NextResponse.json(
          { error: `Invalid date format. Must be one of: ${VALID_DATE_FORMATS.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.dateFormat = dateFormat;
    }

    if (maxParallelTasks !== undefined) {
      const value = parseInt(maxParallelTasks, 10);
      if (isNaN(value) || value < 1 || value > 10) {
        return NextResponse.json(
          { error: 'maxParallelTasks must be between 1 and 10' },
          { status: 400 }
        );
      }
      updateData.maxParallelTasks = value;
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });

    // Sync in-memory task queue limit
    if (updateData.maxParallelTasks !== undefined) {
      setMaxParallelTasks(updateData.maxParallelTasks);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
