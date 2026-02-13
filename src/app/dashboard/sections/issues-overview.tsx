'use client';

/**
 * Issues Overview section — issue counts + recent issues
 * Visible to all users
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIssueCounts } from '@/lib/contexts/issue-context';
import { getIssueStatusVariant, ISSUE_STATUS_LABELS } from '@/lib/issue-utils';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';

interface RecentIssue {
  id: number;
  type: IssueType;
  status: IssueStatus;
  createdAt: string;
  episode: {
    episodeNumber: number;
    season: {
      seasonNumber: number;
      tvShow: { id: number; title: string };
    };
  };
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Status filters shown as clickable badges */
const STATUS_FILTERS: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function IssuesOverview() {
  const { active, total } = useIssueCounts();
  const [allIssues, setAllIssues] = useState<RecentIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/issues')
      .then((r) => r.json())
      .then((data) => {
        const issues = Array.isArray(data) ? data : [];
        setAllIssues(issues);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Count issues per status for the filter badges
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<IssueStatus, number>> = {};
    for (const issue of allIssues) {
      counts[issue.status] = (counts[issue.status] || 0) + 1;
    }
    return counts;
  }, [allIssues]);

  // Filter and limit displayed issues
  const displayedIssues = useMemo(() => {
    const filtered = statusFilter
      ? allIssues.filter((i) => i.status === statusFilter)
      : allIssues;
    return filtered.slice(0, 5);
  }, [allIssues, statusFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Issues
          </CardTitle>
          <CardDescription>Reported problems across your library</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/issues">
            View All
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Clickable status filter badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge
            variant={statusFilter === null ? 'default' : 'outline'}
            className="text-xs cursor-pointer"
            onClick={() => setStatusFilter(null)}
          >
            All ({allIssues.length})
          </Badge>
          {STATUS_FILTERS.map((status) => {
            const count = statusCounts[status] || 0;
            if (count === 0) return null;
            return (
              <Badge
                key={status}
                variant={statusFilter === status ? getIssueStatusVariant(status) : 'outline'}
                className="text-xs cursor-pointer"
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              >
                {ISSUE_STATUS_LABELS[status]} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Issues list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : displayedIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {statusFilter ? 'No issues with this status' : 'No issues reported yet'}
          </p>
        ) : (
          <ul className="space-y-2">
            {displayedIssues.map((issue) => {
              const ep = issue.episode;
              const code = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
              return (
                <li key={issue.id} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/tv-shows/${ep.season.tvShow.id}`}
                    className="truncate hover:underline"
                  >
                    {ep.season.tvShow.title} {code}
                  </Link>
                  <Badge variant={getIssueStatusVariant(issue.status)} className="text-xs shrink-0 ml-auto">
                    {ISSUE_STATUS_LABELS[issue.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTimeAgo(issue.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
