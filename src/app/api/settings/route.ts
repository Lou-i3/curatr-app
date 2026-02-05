import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_DATE_FORMATS = ['EU', 'US', 'ISO'];

export async function GET() {
  try {
    // Get or create settings with default values
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

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
    const { dateFormat } = body;

    const updateData: { dateFormat?: string } = {};

    if (dateFormat !== undefined) {
      if (!VALID_DATE_FORMATS.includes(dateFormat)) {
        return NextResponse.json(
          { error: `Invalid date format. Must be one of: ${VALID_DATE_FORMATS.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.dateFormat = dateFormat;
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
