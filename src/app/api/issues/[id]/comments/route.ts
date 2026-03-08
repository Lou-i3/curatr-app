/**
 * Issue Comments API
 * GET: List comments for an issue (ordered by createdAt ASC)
 * POST: Add a comment to an issue (any authenticated user)
 *
 * @swagger
 * /api/issues/{id}/comments:
 *   get:
 *     summary: List comments for an issue
 *     description: Returns all comments and activity entries for an issue, ordered chronologically.
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
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
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
 *   post:
 *     summary: Add a comment to an issue
 *     description: Creates a new comment on an issue. Any authenticated user can comment.
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Comment text
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
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
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, checkAuth } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
      select: { id: true },
    });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const comments = await prisma.issueComment.findMany({
      where: { issueId },
      include: {
        user: { select: { id: true, username: true, thumbUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
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

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true },
    });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const comment = await prisma.issueComment.create({
      data: {
        issueId,
        userId: session.user.id,
        type: 'COMMENT',
        content,
      },
      include: {
        user: { select: { id: true, username: true, thumbUrl: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
