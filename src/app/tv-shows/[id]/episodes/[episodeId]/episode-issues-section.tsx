'use client';

/**
 * Episode Issues Section — client wrapper for the issues sidebar
 * Handles refreshing the server-rendered issues list after new reports
 */

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { IssueReportDialog } from '@/components/issues/issue-report-dialog';
import { EpisodeIssuesList } from './episode-issues-list';
import { useIssueContext } from '@/lib/contexts/issue-context';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';

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

interface EpisodeIssuesSectionProps {
  episodeId: number;
  episodeLabel: string;
  issues: IssueData[];
  dateFormat: string;
  platforms: string[];
  audioLanguages: string[];
  subtitleLanguages: string[];
}

export function EpisodeIssuesSection({
  episodeId,
  episodeLabel,
  issues,
  dateFormat,
  platforms,
  audioLanguages,
  subtitleLanguages,
}: EpisodeIssuesSectionProps) {
  const router = useRouter();
  const { refresh: refreshCounts } = useIssueContext();

  const handleIssueSubmitted = () => {
    router.refresh();
    refreshCounts();
  };

  return (
    <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-bold">Issues ({issues.length})</h2>
        <IssueReportDialog
          episodeId={episodeId}
          episodeLabel={episodeLabel}
          platforms={platforms}
          audioLanguages={audioLanguages}
          subtitleLanguages={subtitleLanguages}
          onSubmitted={handleIssueSubmitted}
        />
      </div>
      {issues.length > 0 ? (
        <EpisodeIssuesList
          issues={issues}
          dateFormat={dateFormat}
          episodeLabel={episodeLabel}
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No issues reported for this episode.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
