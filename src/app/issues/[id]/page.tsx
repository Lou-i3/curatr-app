/**
 * Issue Detail Page
 * Server component that fetches issue data and renders the client detail view
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageContainer } from '@/components/layout/page-container';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { getSettings } from '@/lib/settings';
import { IssueDetailClient } from './issue-detail-client';
import type { DateFormat } from '@/lib/settings-shared';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id } = await params;
  const issueId = parseInt(id, 10);
  if (isNaN(issueId)) notFound();

  const [issue, settings] = await Promise.all([
    prisma.issue.findUnique({
      where: { id: issueId },
      include: {
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
            { episode: { season: { seasonNumber: 'asc' } } },
            { episode: { episodeNumber: 'asc' } },
          ],
        },
        comments: {
          include: {
            user: { select: { id: true, username: true, thumbUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    getSettings(),
  ]);

  if (!issue) notFound();

  // Fetch related issues (other issues on the same episodes)
  const episodeIds = issue.episodes.map((ie) => ie.episodeId);
  let relatedIssues: Array<{
    id: number;
    type: string;
    status: string;
    createdAt: Date;
    user: { id: number; username: string; thumbUrl: string | null };
    _count: { episodes: number };
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
        user: { select: { id: true, username: true, thumbUrl: true } },
        _count: { select: { episodes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Serialize dates for client component
  const serializedIssue = {
    ...issue,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    episodes: issue.episodes.map((ie) => ({
      ...ie,
      createdAt: ie.createdAt.toISOString(),
    })),
    comments: issue.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  const serializedRelated = relatedIssues.map((ri) => ({
    ...ri,
    createdAt: ri.createdAt.toISOString(),
  }));

  return (
    <PageContainer maxWidth="wide">
      <PageBreadcrumbs
        items={[
          { label: 'Issues', href: '/issues' },
          { label: `Issue #${issue.id}` },
        ]}
      />
      <IssueDetailClient
        issue={serializedIssue}
        relatedIssues={serializedRelated}
        dateFormat={settings.dateFormat as DateFormat}
      />
    </PageContainer>
  );
}
