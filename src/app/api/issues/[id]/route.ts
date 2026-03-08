/**
 * Single Issue API
 * GET: Get issue details with episodes, comments, and related issues
 * PATCH: Update issue (reporter can edit own open issues, admin can change status)
 * DELETE: Delete issue (reporter can delete own open issues, admin can delete any)
 *
 * @swagger
 * /api/issues/{id}:
 *   get:
 *     summary: Get issue details
 *     description: Returns full issue details including episodes, comments, and related issues.
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
 *     description: Updates issue fields. Reporters can edit their own open issues. Admins can change status. Activity is logged automatically.
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
import { ISSUE_TYPE_LABELS, ISSUE_STATUS_LABELS, ISSUE_SUB_TYPES, ISSUE_SUB_TYPE_LABELS, TYPES_WITH_SUB_TYPE, type IssueSubType } from '@/lib/issue-utils';

const VALID_TYPES: IssueType[] = ['PLAYBACK', 'QUALITY', 'AUDIO', 'SUBTITLE', 'CONTENT', 'OTHER'];
const VALID_STATUSES: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Full include for issue detail page */
const detailInclude = {
  user: { select: { id: true, username: true, thumbUrl: true, role: true } },
  episodes: {
    include: {
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
    },
    orderBy: [
      { episode: { season: { seasonNumber: 'asc' as const } } },
      { episode: { episodeNumber: 'asc' as const } },
    ],
  },
  comments: {
    include: {
      user: { select: { id: true, username: true, thumbUrl: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { id } = await context.params;
    const issueId = parseInt(id, 10);
    if (isNaN(issueId)) {
      return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 });
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: detailInclude,
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Fetch related issues (other issues on the same episodes)
    const episodeIds = issue.episodes.map((ie) => ie.episodeId);
    let relatedIssues: Array<{
      id: number;
      type: IssueType;
      status: IssueStatus;
      createdAt: Date;
      user: { id: number; username: string };
    }> = [];

    if (episodeIds.length > 0) {
      relatedIssues = await prisma.issue.findMany({
        where: {
          id: { not: issueId },
          episodes: { some: { episodeId: { in: episodeIds } } },
        },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    return NextResponse.json({ ...issue, relatedIssues });
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
    const activityParts: string[] = [];

    // Reporter can edit content fields (only while OPEN)
    if (isOwner && issue.status === 'OPEN') {
      if (body.type !== undefined) {
        if (!VALID_TYPES.includes(body.type)) {
          return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 });
        }
        if (body.type !== issue.type) {
          activityParts.push(
            `changed type from ${ISSUE_TYPE_LABELS[issue.type as IssueType]} to ${ISSUE_TYPE_LABELS[body.type as IssueType]}`
          );
          data.type = body.type;
        }
      }
      if (body.description !== undefined && (body.description || null) !== issue.description) {
        activityParts.push('updated description');
        data.description = body.description || null;
      }
      if (body.platform !== undefined && (body.platform || null) !== issue.platform) {
        const oldPlatform = issue.platform || 'none';
        const newPlatform = body.platform || 'none';
        activityParts.push(`changed platform from ${oldPlatform} to ${newPlatform}`);
        data.platform = body.platform || null;
      }
      if (body.audioLang !== undefined && (body.audioLang || null) !== issue.audioLang) {
        activityParts.push('updated audio language');
        data.audioLang = body.audioLang || null;
      }
      if (body.subtitleLang !== undefined && (body.subtitleLang || null) !== issue.subtitleLang) {
        activityParts.push('updated subtitle language');
        data.subtitleLang = body.subtitleLang || null;
      }

      // Handle subType
      if (body.subType !== undefined && (body.subType || null) !== issue.subType) {
        const effectiveType = (data.type as string) || issue.type;
        if (TYPES_WITH_SUB_TYPE.includes(effectiveType as IssueType) && body.subType && (ISSUE_SUB_TYPES as readonly string[]).includes(body.subType)) {
          const oldLabel = issue.subType ? ISSUE_SUB_TYPE_LABELS[issue.subType as IssueSubType] : 'none';
          const newLabel = ISSUE_SUB_TYPE_LABELS[body.subType as IssueSubType];
          activityParts.push(`changed sub-type from ${oldLabel} to ${newLabel}`);
          data.subType = body.subType;
        } else {
          data.subType = null;
          if (issue.subType) {
            activityParts.push('removed sub-type');
          }
        }
      }

      // If type changed away from AUDIO/SUBTITLE, clear subType
      if (data.type && !TYPES_WITH_SUB_TYPE.includes(data.type as IssueType) && issue.subType) {
        data.subType = null;
      }
    }

    // Admin can change status
    if (isAdmin && body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (body.status !== issue.status) {
        activityParts.push(
          `changed status from ${ISSUE_STATUS_LABELS[issue.status as IssueStatus]} to ${ISSUE_STATUS_LABELS[body.status as IssueStatus]}`
        );
        data.status = body.status;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update issue and create activity comment in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.issue.update({
        where: { id: issueId },
        data,
        include: {
          user: { select: { id: true, username: true, thumbUrl: true } },
        },
      });

      // Create activity comment for the changes
      if (activityParts.length > 0) {
        await tx.issueComment.create({
          data: {
            issueId,
            userId: session.user.id,
            type: 'ACTIVITY',
            content: activityParts.join(', '),
          },
        });
      }

      return result;
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
