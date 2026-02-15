'use client';

/**
 * Issues Page — lists all reported issues with status filters, card/table views, and admin actions
 * Card view for mobile-friendly browsing, table view with DataTable for sorting
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  getIssueTypeVariant,
  getIssueStatusVariant,
} from '@/lib/issue-utils';
import { formatDateTimeWithFormat } from '@/lib/settings-shared';
import type { IssueStatus } from '@/generated/prisma/client';
import type { DateFormat } from '@/lib/settings-shared';
import { getIssueColumns, type IssueRow } from './issue-columns';
import { ViewToggle } from '@/components/view-toggle';
import { IssueReportSearchDialog } from '@/components/issues/issue-report-search-dialog';
import { IssueEditDialog } from '@/components/issues/issue-edit-dialog';
import { PageHeader } from '@/components/page-header';
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

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="size-7" />
          </div>
        </div>
        <Skeleton className="h-5 w-48 mb-1" />
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, authMode, user } = useAuth();
  const { refresh: refreshCounts } = useIssueContext();

  const currentView = searchParams.get('view') ?? 'cards';

  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const updateView = useCallback((view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'cards') {
      params.delete('view');
    } else {
      params.set('view', view);
    }
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

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
  const isTableView = currentView === 'table';

  return (
    <PageContainer maxWidth="wide">
      {/* Sticky Header */}
      <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <PageHeader
          title={`Issues ${!loading ? `(${filteredIssues.length})` : ''}`}
          description="Track and manage reported issues across your library"
          breadcrumbs={[{ label: 'Issues' }]}
          action={<IssueReportSearchDialog onSubmitted={fetchIssues} />}
          className="mb-0"
        />

        {/* Status Filter Chips + View Toggle */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-none md:flex-wrap">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap flex-shrink-0 ${
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

          {/* View Toggle */}
          <ViewToggle
            isTableView={isTableView}
            onViewChange={(view) => updateView(view)}
          />
        </div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          isTableView ? (
            <Card className="p-0">
              <CardContent className="p-2">
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
          ) : (
            <div className="space-y-4 md:space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
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
        ) : isTableView ? (
          /* Table View */
          <Card className="p-0">
            <CardContent className="p-2">
              <div className="overflow-x-auto">
                <DataTable
                  columns={columns}
                  data={filteredIssues}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card View */
          <div className="space-y-4 md:space-y-6">
            {filteredIssues.map((issue) => {
              const ep = issue.episode;
              const epLabel = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
              const fullLabel = `${ep.season.tvShow.title} — ${epLabel}`;
              const isOwner = user?.id !== undefined && issue.user?.id === user.id;
              const canEdit = isAdmin || isOwner;
              const canDelete = isAdmin || (isOwner && issue.status === 'OPEN');

              return (
                <Card key={issue.id} className='p-0'>
                  <CardContent className="p-4 md:p-6">
                    {/* Top row: badges + actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getIssueStatusVariant(issue.status)}>
                          {ISSUE_STATUS_LABELS[issue.status]}
                        </Badge>
                        <Badge variant={getIssueTypeVariant(issue.type)}>
                          {ISSUE_TYPE_LABELS[issue.type]}
                        </Badge>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {canEdit && (
                            <IssueEditDialog
                              issue={issue}
                              episodeLabel={fullLabel}
                              isAdmin={isAdmin}
                              isOwner={isOwner}
                              onUpdated={(updated) => handleIssueUpdated(issue.id, updated)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              }
                            />
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive-foreground"
                              onClick={() => handleDelete(issue.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Episode info */}
                    <Link
                      href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
                      className="hover:underline"
                    >
                      <p className="font-medium text-sm">{ep.season.tvShow.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {epLabel}{ep.title ? ` — ${ep.title}` : ''}
                      </p>
                    </Link>

                    {/* Description */}
                    {issue.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {issue.description}
                      </p>
                    )}

                    {/* Context: platform, audio, subtitle */}
                    {(issue.platform || issue.audioLang || issue.subtitleLang) && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {issue.platform && (
                          <Badge variant="outline" className="text-xs">{issue.platform}</Badge>
                        )}
                        {issue.audioLang && (
                          <Badge variant="outline" className="text-xs">Audio: {issue.audioLang}</Badge>
                        )}
                        {issue.subtitleLang && (
                          <Badge variant="outline" className="text-xs">Sub: {issue.subtitleLang}</Badge>
                        )}
                      </div>
                    )}

                    {/* Footer: reporter + date */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      {authMode === 'plex' && issue.user ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {issue.user.thumbUrl ? (
                            <img src={issue.user.thumbUrl} alt="" className="size-4 rounded-full" />
                          ) : (
                            <User className="size-3.5" />
                          )}
                          {issue.user.username}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeWithFormat(new Date(issue.createdAt), dateFormat)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
