/**
 * Issues API
 * GET: List issues with filters (status, type, episodeId, showId)
 * POST: Create new issue (any authenticated user, or local admin in no-auth mode)
 *
 * @swagger
 * /api/issues:
 *   get:
 *     summary: List issues with optional filters
 *     description: Returns a list of issues, optionally filtered by status, type, episode, or show.
 *     tags: [Issues]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/IssueStatus'
 *         description: Filter by issue status
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/IssueType'
 *         description: Filter by issue type
 *       - in: query
 *         name: episodeId
 *         schema:
 *           type: integer
 *         description: Filter by episode ID
 *       - in: query
 *         name: showId
 *         schema:
 *           type: integer
 *         description: Filter by TV show ID
 *     responses:
 *       200:
 *         description: List of issues
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create an issue
 *     description: Creates a new issue for one or more episodes. Requires authentication.
 *     tags: [Issues]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [episodeIds, type]
 *             properties:
 *               episodeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs of the episodes this issue relates to
 *               type:
 *                 $ref: '#/components/schemas/IssueType'
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               platform:
 *                 type: string
 *                 description: Platform where the issue was observed
 *               audioLang:
 *                 type: string
 *                 description: Audio language when issue occurred
 *               subtitleLang:
 *                 type: string
 *                 description: Subtitle language when issue occurred
 *     responses:
 *       201:
 *         description: Issue created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error (missing or invalid fields)
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
 *         description: Episode not found
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
import { ISSUE_SUB_TYPES, TYPES_WITH_SUB_TYPE } from '@/lib/issue-utils';

const VALID_TYPES: IssueType[] = ['PLAYBACK', 'QUALITY', 'AUDIO', 'SUBTITLE', 'CONTENT', 'OTHER'];
const VALID_STATUSES: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

/** Shared include for issue episodes with full chain */
const episodesInclude = {
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
};

export async function GET(request: Request) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const episodeId = searchParams.get('episodeId');
    const showId = searchParams.get('showId');

    const where: Record<string, unknown> = {};

    if (status && VALID_STATUSES.includes(status as IssueStatus)) {
      where.status = status;
    }

    if (type && VALID_TYPES.includes(type as IssueType)) {
      where.type = type;
    }

    if (episodeId) {
      const parsed = parseInt(episodeId, 10);
      if (!isNaN(parsed)) {
        where.episodes = { some: { episodeId: parsed } };
      }
    }

    if (showId) {
      const parsed = parseInt(showId, 10);
      if (!isNaN(parsed)) {
        where.episodes = {
          some: { episode: { season: { tvShowId: parsed } } },
        };
      }
    }

    const issues = await prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, thumbUrl: true, role: true } },
        ...episodesInclude,
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { episodeIds, type, description, platform, audioLang, subtitleLang, subType } = body;

    // Validate required fields
    if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
      return NextResponse.json({ error: 'At least one episode ID is required' }, { status: 400 });
    }

    // Validate all IDs are numbers
    const parsedIds = episodeIds.map((id: unknown) => {
      if (typeof id !== 'number' || isNaN(id)) return null;
      return id;
    });
    if (parsedIds.some((id: number | null) => id === null)) {
      return NextResponse.json({ error: 'All episode IDs must be valid numbers' }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Valid type is required (${VALID_TYPES.join(', ')})` },
        { status: 400 }
      );
    }

    // Validate subType if provided
    const validatedSubType = subType && TYPES_WITH_SUB_TYPE.includes(type)
      ? (ISSUE_SUB_TYPES as readonly string[]).includes(subType) ? subType : null
      : null;

    // Verify all episodes exist
    const episodes = await prisma.episode.findMany({
      where: { id: { in: parsedIds as number[] } },
      select: { id: true },
    });
    if (episodes.length !== parsedIds.length) {
      return NextResponse.json({ error: 'One or more episodes not found' }, { status: 404 });
    }

    // Create issue with episode links in a transaction
    const issue = await prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          userId: session.user.id,
          type,
          description: description || null,
          platform: platform || null,
          audioLang: audioLang || null,
          subtitleLang: subtitleLang || null,
          subType: validatedSubType,
          episodes: {
            create: (parsedIds as number[]).map((episodeId) => ({
              episodeId,
            })),
          },
        },
        include: {
          user: { select: { id: true, username: true, thumbUrl: true } },
          ...episodesInclude,
        },
      });
      return created;
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error('Failed to create issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    );
  }
}
