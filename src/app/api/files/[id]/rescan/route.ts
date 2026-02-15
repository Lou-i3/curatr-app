/**
 * File Rescan API
 * POST: Re-check file existence and metadata on disk
 *
 * @swagger
 * /api/files/{id}/rescan:
 *   post:
 *     summary: Rescan a file on disk
 *     description: Checks if the file still exists on disk and updates its size and modification date. Does not re-analyze media info.
 *     tags: [Files]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: Updated file status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileExists:
 *                   type: boolean
 *                 fileSize:
 *                   type: string
 *                   nullable: true
 *                 dateModified:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       400:
 *         description: Invalid file ID
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
 *         description: File record not found
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

import { stat } from 'fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const file = await prisma.episodeFile.findUnique({
      where: { id: fileId },
      select: { id: true, filepath: true },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
      const stats = await stat(file.filepath);
      // File exists — update size and modified date
      const updated = await prisma.episodeFile.update({
        where: { id: fileId },
        data: {
          fileExists: true,
          fileSize: BigInt(stats.size),
          dateModified: stats.mtime,
        },
      });
      return NextResponse.json({
        fileExists: true,
        fileSize: updated.fileSize.toString(),
        dateModified: updated.dateModified.toISOString(),
      });
    } catch {
      // File no longer exists on disk
      await prisma.episodeFile.update({
        where: { id: fileId },
        data: { fileExists: false },
      });
      return NextResponse.json({
        fileExists: false,
        fileSize: null,
        dateModified: null,
      });
    }
  } catch (error) {
    console.error('Failed to rescan file:', error);
    return NextResponse.json(
      { error: 'Failed to rescan file' },
      { status: 500 }
    );
  }
}
