/**
 * File CRUD API
 * PATCH: Update file quality and action
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FileQuality, Action } from '@/generated/prisma/client';

const VALID_QUALITIES: FileQuality[] = ['UNVERIFIED', 'OK', 'BROKEN'];
const VALID_ACTIONS: Action[] = ['NOTHING', 'REDOWNLOAD', 'CONVERT', 'ORGANIZE', 'REPAIR'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const body = await request.json();
    const { quality, action, notes } = body;

    // Build update data
    const updateData: {
      quality?: FileQuality;
      action?: Action;
      notes?: string | null;
    } = {};

    if (quality !== undefined) {
      if (!VALID_QUALITIES.includes(quality)) {
        return NextResponse.json({ error: 'Invalid quality' }, { status: 400 });
      }
      updateData.quality = quality;
    }

    if (action !== undefined) {
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
      updateData.action = action;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const file = await prisma.episodeFile.update({
      where: { id: fileId },
      data: updateData,
    });

    // Convert BigInt to string for JSON serialization
    return NextResponse.json({
      ...file,
      fileSize: file.fileSize.toString(),
    });
  } catch (error) {
    console.error('Failed to update file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}
