'use client';

/**
 * Quick Actions section — role-aware action buttons
 * All users see browse/report/issues, admins see additional system actions
 */

import Link from 'next/link';
import { Tv, ListChecks, ScanSearch, ListTodo, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { IssueReportSearchDialog } from '@/components/issues/issue-report-search-dialog';
import { useIssueContext } from '@/lib/contexts/issue-context';
import { useTasksPanel } from '@/components/tasks/tasks-panel';

export function QuickActions() {
  const { isAdmin } = useAuth();
  const { refresh: refreshIssues } = useIssueContext();
  const { setOpen: openTasksPanel } = useTasksPanel();

  return (
    <div className="mb-6 md:mb-8">
      <h2 className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href="/tv-shows">
          <Tv className="size-4" />
          Browse TV Shows
        </Link>
      </Button>

      <IssueReportSearchDialog onSubmitted={refreshIssues} />

      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href="/issues">
          <ListChecks className="size-4" />
          View Issues
        </Link>
      </Button>

      {isAdmin && (
        <>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/scans">
              <ScanSearch className="size-4" />
              Scan Library
            </Link>
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openTasksPanel(true)}>
            <ListTodo className="size-4" />
            View Tasks
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/integrations">
              <Puzzle className="size-4" />
              Integrations
            </Link>
          </Button>
        </>
      )}
      </div>
    </div>
  );
}
