/**
 * Single Comment API
 * DELETE: Delete a comment (admin only, COMMENT type only)
 *
 * @swagger
 * /api/issues/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Deletes a comment on an issue. Admin only. Cannot delete ACTIVITY entries.
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
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Comment not found
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
import { checkAdmin } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string; commentId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const authError = await checkAdmin();
    if (authError) return authError;

    const { id, commentId } = await context.params;
    const issueId = parseInt(id, 10);
    const parsedCommentId = parseInt(commentId, 10);

    if (isNaN(issueId) || isNaN(parsedCommentId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const comment = await prisma.issueComment.findFirst({
      where: { id: parsedCommentId, issueId },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.type === 'ACTIVITY') {
      return NextResponse.json(
        { error: 'Activity entries cannot be deleted' },
        { status: 403 }
      );
    }

    await prisma.issueComment.delete({ where: { id: parsedCommentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
