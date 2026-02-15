'use client';

/**
 * Episode Issues List — displays reported issues on an episode detail page
 * Shows type, status, reporter, and date for each issue
 * Admin can change status inline and edit via dialog
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { BadgeSelector } from '@/components/badge-selector';
import { IssueEditDialog } from '@/components/issues/issue-edit-dialog';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  getIssueTypeVariant,
  getIssueStatusVariant,
} from '@/lib/issue-utils';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { useAuth } from '@/lib/contexts/auth-context';
import { useIssueContext } from '@/lib/contexts/issue-context';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';
import { Calendar, User } from 'lucide-react';

interface IssueData {
  id: number;
  type: IssueType;
  status: IssueStatus;
  description: string | null;
  platform: string | null;
  audioLang: string | null;
  subtitleLang: string | null;
  resolution: string | null;
  createdAt: string | Date;
  user: { id: number; username: string; thumbUrl: string | null } | null;
  resolvedBy: { id: number; username: string } | null;
}

interface EpisodeIssuesListProps {
  issues: IssueData[];
  dateFormat: string;
  episodeLabel?: string;
}

export function EpisodeIssuesList({ issues: initialIssues, dateFormat, episodeLabel }: EpisodeIssuesListProps) {
  const { isAdmin, user } = useAuth();
  const { refresh: refreshCounts } = useIssueContext();
  const [issues, setIssues] = useState(initialIssues);

  // Sync with server data after router.refresh()
  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  const handleStatusChange = useCallback(async (issueId: number, newStatus: string) => {
    const response = await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      toast.error('Failed to update status');
      throw new Error('Failed to update');
    }

    setIssues((prev) =>
      prev.map((i) => i.id === issueId ? { ...i, status: newStatus as IssueStatus } : i)
    );
    refreshCounts();
  }, [refreshCounts]);

  const handleIssueUpdated = useCallback((issueId: number, updated: { status: IssueStatus; resolution: string | null }) => {
    setIssues((prev) =>
      prev.map((i) => i.id === issueId ? { ...i, ...updated } : i)
    );
    refreshCounts();
  }, [refreshCounts]);

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const isOwner = user?.id !== undefined && issue.user?.id === user.id;

        return (
          <div key={issue.id} className="border rounded-lg p-4 space-y-2">
            {/* Line 1: Type + Status + Edit */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getIssueTypeVariant(issue.type)}>
                {ISSUE_TYPE_LABELS[issue.type]}
              </Badge>
              {isAdmin ? (
                <BadgeSelector
                  value={issue.status}
                  options={ISSUE_STATUSES.map((s) => ({
                    value: s,
                    label: ISSUE_STATUS_LABELS[s],
                  }))}
                  displayLabel={ISSUE_STATUS_LABELS[issue.status]}
                  variant={getIssueStatusVariant(issue.status)}
                  getVariant={getIssueStatusVariant}
                  onValueChange={(newStatus) => handleStatusChange(issue.id, newStatus)}
                />
              ) : (
                <Badge variant={getIssueStatusVariant(issue.status)}>
                  {ISSUE_STATUS_LABELS[issue.status]}
                </Badge>
              )}
              {issue.platform && (
                <Badge variant="outline">{issue.platform}</Badge>
              )}
              {(isAdmin || isOwner) && (
                <IssueEditDialog
                  issue={issue}
                  episodeLabel={episodeLabel || ''}
                  isAdmin={isAdmin}
                  isOwner={isOwner}
                  onUpdated={(updated) => handleIssueUpdated(issue.id, updated)}
                />
              )}
            </div>

            {/* Line 2: Reporter + Date */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {issue.user && (
                <span className="flex items-center gap-1">
                  {issue.user.thumbUrl ? (
                    <img src={issue.user.thumbUrl} alt="" className="size-3.5 rounded-full" />
                  ) : (
                    <User className="size-3" />
                  )}
                  {issue.user.username}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDateTimeWithFormat(new Date(issue.createdAt), dateFormat as DateFormat)}
              </span>
            </div>

            {/* Description */}
            {issue.description && (
              <p className="text-sm text-muted-foreground">{issue.description}</p>
            )}

            {/* Resolution */}
            {issue.resolution && (
              <div className="text-sm bg-muted p-2 rounded">
                <span className="font-medium">Resolution: </span>
                <span className="text-muted-foreground">{issue.resolution}</span>
                {issue.resolvedBy && (
                  <span className="text-xs text-muted-foreground"> — {issue.resolvedBy.username}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
