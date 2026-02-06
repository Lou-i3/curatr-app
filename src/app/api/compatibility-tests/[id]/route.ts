/**
 * Compatibility Test CRUD API
 * PATCH: Update test status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TestStatus } from '@/generated/prisma/client';

const VALID_STATUSES: TestStatus[] = ['NOT_TESTED', 'WORKS', 'PLAYABLE', 'FAILS'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const testId = parseInt(id, 10);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    // Build update data
    const updateData: {
      status?: TestStatus;
      notes?: string | null;
    } = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const test = await prisma.compatibilityTest.update({
      where: { id: testId },
      data: updateData,
    });

    return NextResponse.json(test);
  } catch (error) {
    console.error('Failed to update compatibility test:', error);
    return NextResponse.json(
      { error: 'Failed to update compatibility test' },
      { status: 500 }
    );
  }
}
