/**
 * Single Issue API
 * GET: Get issue details
 * PATCH: Update issue (reporter can edit own open issues, admin can change status/resolution)
 * DELETE: Delete issue (reporter can delete own open issues, admin can delete any)
 *
 * @swagger
 * /api/issues/{id}:
 *   get:
 *     summary: Get issue details
 *     description: Returns full issue details including episode, show, reporter, and resolver info.
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Issue ID
 *     responses:
 *       200:
 *         description: Issue details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Issue not found
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
 *     summary: Update an issue
 *     description: Updates issue fields. Reporters can edit their own open issues. Admins can change status and resolution.
 *     tags: [Issues]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/IssueStatus'
 *               resolution:
 *                 type: string
 *                 description: Resolution notes (admin only)
 *               type:
 *                 $ref: '#/components/schemas/IssueType'
 *               description:
 *                 type: string
 *               platform:
 *                 type: string
 *               audioLang:
 *                 type: string
 *               subtitleLang:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated issue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error or no valid fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Issue not found
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
 *     summary: Delete an issue
 *     description: Deletes an issue. Reporters can delete their own open issues. Admins can delete any issue.
 *     tags: [Issues]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Issue ID
 *     responses:
 *       200:
 *         description: Issue deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized to delete this issue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Issue not found
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
import { getSession, checkAuth } from '@/lib/auth';
import { IssueType, IssueStatus } from '@/generated/prisma/client';

const VALID_TYPES: IssueType[] = ['PLAYBACK', 'QUALITY', 'AUDIO', 'SUBTITLE', 'CONTENT', 'OTHER'];
const VALID_STATUSES: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const issueId = parseInt(id, 10);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        user: { select: { id: true, username: true, thumbUrl: true, role: true } },
        episode: {
          select: {
            id: true,
            episodeNumber: true,
            title: true,
            season: {
              select: {
                seasonNumber: true,
                tvShow: { select: { id: true, title: true } },
              },
            },
          },
        },
        resolvedBy: { select: { id: true, username: true } },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch (error) {
    console.error('Failed to fetch issue:', error);
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const issueId = parseInt(id, 10);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 });
    }

    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const isOwner = issue.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    const body = await request.json();
    const data: Record<string, unknown> = {};

    // Reporter can edit content fields (only while OPEN)
    if (isOwner && issue.status === 'OPEN') {
      if (body.type !== undefined) {
        if (!VALID_TYPES.includes(body.type)) {
          return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 });
        }
        data.type = body.type;
      }
      if (body.description !== undefined) data.description = body.description || null;
      if (body.platform !== undefined) data.platform = body.platform || null;
      if (body.audioLang !== undefined) data.audioLang = body.audioLang || null;
      if (body.subtitleLang !== undefined) data.subtitleLang = body.subtitleLang || null;
    }

    // Admin can change status and resolution
    if (isAdmin) {
      if (body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        data.status = body.status;

        if (body.status === 'RESOLVED' && issue.status !== 'RESOLVED') {
          data.resolvedAt = new Date();
          data.resolvedById = session.user.id;
        }
        if (body.status === 'OPEN') {
          data.resolvedAt = null;
          data.resolvedById = null;
        }
      }
      if (body.resolution !== undefined) data.resolution = body.resolution || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data,
      include: {
        user: { select: { id: true, username: true, thumbUrl: true } },
        resolvedBy: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update issue:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const issueId = parseInt(id, 10);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 });
    }

    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const isOwner = issue.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isAdmin && !(isOwner && issue.status === 'OPEN')) {
      return NextResponse.json(
        { error: 'You can only delete your own open issues' },
        { status: 403 }
      );
    }

    await prisma.issue.delete({ where: { id: issueId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete issue:', error);
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
  }
}
