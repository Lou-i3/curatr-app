'use client';

/**
 * Issues Page — lists all reported issues with status filters and admin actions
 * Uses DataTable for sorting, BadgeSelector for inline status changes
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/lib/contexts/auth-context';
import { useIssueContext } from '@/lib/contexts/issue-context';
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  getIssueStatusVariant,
} from '@/lib/issue-utils';
import type { IssueStatus } from '@/generated/prisma/client';
import type { DateFormat } from '@/lib/settings-shared';
import { getIssueColumns, type IssueRow } from './issue-columns';
import { IssueReportSearchDialog } from '@/components/issues/issue-report-search-dialog';
import { PageContainer } from '@/components/layout';

type StatusFilter = IssueStatus | 'all' | 'active';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  ...ISSUE_STATUSES.map((s) => ({ value: s as StatusFilter, label: ISSUE_STATUS_LABELS[s] })),
];

function TableRowSkeleton({ colCount }: { colCount: number }) {
  return (
    <TableRow>
      {Array.from({ length: colCount }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-5 w-20" /></TableCell>
      ))}
    </TableRow>
  );
}

export default function IssuesPage() {
  const { isAdmin, authMode, user } = useAuth();
  const { refresh: refreshCounts } = useIssueContext();

  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Fetch settings for date format
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setDateFormat(s.dateFormat || 'EU'))
      .catch(() => {});
  }, []);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // "active" is a virtual filter — we fetch all and filter client-side
      // For specific statuses, filter server-side
      if (statusFilter !== 'all' && statusFilter !== 'active') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/issues?${params}`);
      if (!response.ok) throw new Error('Failed to fetch issues');
      const data = await response.json();
      setIssues(data);
    } catch {
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Client-side filter for "active" (OPEN + ACKNOWLEDGED + IN_PROGRESS)
  const filteredIssues = useMemo(() => {
    if (statusFilter === 'active') {
      return issues.filter((i) =>
        i.status === 'OPEN' || i.status === 'ACKNOWLEDGED' || i.status === 'IN_PROGRESS'
      );
    }
    return issues;
  }, [issues, statusFilter]);

  // Status change handler
  const handleStatusChange = useCallback(async (issueId: number, status: IssueStatus) => {
    const response = await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      toast.error('Failed to update issue status');
      throw new Error('Failed to update');
    }

    // Update local state optimistically
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status } : i
      )
    );
    refreshCounts();
  }, [refreshCounts]);

  // Issue updated handler (from edit dialog)
  const handleIssueUpdated = useCallback((issueId: number, updated: { status: IssueStatus; resolution: string | null }) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, ...updated } : i
      )
    );
    refreshCounts();
  }, [refreshCounts]);

  // Delete handler
  const handleDelete = useCallback(async (issueId: number) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete issue');
      }

      setIssues((prev) => prev.filter((i) => i.id !== issueId));
      toast.success('Issue deleted');
      refreshCounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete issue');
    }
  }, [refreshCounts]);

  // Build columns
  const columns = useMemo(
    () =>
      getIssueColumns({
        isAdmin,
        authMode,
        currentUserId: user?.id ?? null,
        dateFormat,
        onStatusChange: handleStatusChange,
        onIssueUpdated: handleIssueUpdated,
        onDelete: handleDelete,
      }),
    [isAdmin, authMode, user?.id, dateFormat, handleStatusChange, handleIssueUpdated, handleDelete]
  );

  // Count by status for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: issues.length, active: 0 };
    for (const s of ISSUE_STATUSES) counts[s] = 0;
    for (const issue of issues) {
      counts[issue.status] = (counts[issue.status] || 0) + 1;
      if (issue.status === 'OPEN' || issue.status === 'ACKNOWLEDGED' || issue.status === 'IN_PROGRESS') {
        counts.active++;
      }
    }
    return counts;
  }, [issues]);

  const colCount = authMode === 'plex' ? 7 : 6;

  return (
    <PageContainer maxWidth="wide">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 md:size-6" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Issues</h1>
              {!loading && (
                <span className="text-muted-foreground text-base md:text-lg ml-1">
                  ({filteredIssues.length})
                </span>
              )}
            </div>
            <IssueReportSearchDialog onSubmitted={fetchIssues} />
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Track and manage reported issues across your library
          </p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            const count = statusCounts[filter.value] ?? 0;
            const variant = filter.value !== 'all' && filter.value !== 'active'
              ? getIssueStatusVariant(filter.value as IssueStatus)
              : undefined;

            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {!isActive && variant && (
                  <Badge variant={variant} className="size-2 p-0 rounded-full" />
                )}
                {filter.label}
                {!loading && (
                  <span className={`text-xs ${isActive ? 'opacity-75' : 'opacity-50'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Episode</TableHead>
                    {authMode === 'plex' && <TableHead>Reporter</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} colCount={colCount} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="size-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">
                {statusFilter !== 'all' ? 'No issues match this filter.' : 'No issues reported yet.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all'
                  ? 'Try a different status filter or view all issues.'
                  : 'Issues reported on episode pages will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-0">
            <CardContent className="p-2">
              <DataTable
                columns={columns}
                data={filteredIssues}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
