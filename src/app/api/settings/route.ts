import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setMaxParallelTasks } from '@/lib/tasks';
import { checkAdmin, checkAuth } from '@/lib/auth';

const VALID_DATE_FORMATS = ['EU', 'US', 'ISO'];

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get application settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Current settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 dateFormat:
 *                   type: string
 *                   enum: [EU, US, ISO]
 *                 maxParallelTasks:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update application settings
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateFormat:
 *                 type: string
 *                 enum: [EU, US, ISO]
 *               maxParallelTasks:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Updated settings
 *       400:
 *         description: Validation error
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
export async function GET() {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

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
    const authError = await checkAdmin();
    if (authError) return authError;

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
