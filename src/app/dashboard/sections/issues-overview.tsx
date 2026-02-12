'use client';

/**
 * Issues Overview section — issue counts + recent issues
 * Visible to all users
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIssueCounts } from '@/lib/contexts/issue-context';
import { ISSUE_TYPE_LABELS, getIssueTypeVariant, getIssueStatusVariant, ISSUE_STATUS_LABELS } from '@/lib/issue-utils';
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

export function IssuesOverview() {
  const { active, total } = useIssueCounts();
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/issues?limit=5')
      .then((r) => r.json())
      .then((data) => setRecentIssues((data.issues || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="mb-6 md:mb-8">
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
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Issue counts */}
          <div className="flex flex-wrap gap-3 md:flex-col md:gap-2 md:min-w-[140px]">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-destructive-foreground">{active}</span>
              <span className="text-sm text-muted-foreground">active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-muted-foreground">{total}</span>
              <span className="text-sm text-muted-foreground">total</span>
            </div>
          </div>

          {/* Recent issues list */}
          <div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No issues reported yet
              </p>
            ) : (
              <ul className="space-y-2">
                {recentIssues.map((issue) => {
                  const ep = issue.episode;
                  const code = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
                  return (
                    <li key={issue.id} className="flex items-center gap-2 text-sm">
                      <Badge variant={getIssueTypeVariant(issue.type)} className="text-xs shrink-0">
                        {ISSUE_TYPE_LABELS[issue.type]}
                      </Badge>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
