'use client';

/**
 * Issues Page — lists all reported issues with status filters, card/table views, and admin actions
 * Card view for mobile-friendly browsing, table view with DataTable for sorting
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, User, Volume2, Captions } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import { BadgeSelector } from '@/components/badge-selector';
import { useAuth } from '@/lib/contexts/auth-context';
import { useIssueContext } from '@/lib/contexts/issue-context';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  ISSUE_TYPE_ICONS,
  ISSUE_STATUS_ICONS,
  ISSUE_SUB_TYPE_LABELS,
  PLATFORM_ICON,
  getIssueTypeVariant,
  getIssueStatusVariant,
  type IssueSubType,
} from '@/lib/issue-utils';
import { formatDateTimeWithFormat } from '@/lib/settings-shared';
import type { IssueStatus } from '@/generated/prisma/client';
import type { DateFormat } from '@/lib/settings-shared';
import { getIssueColumns, type IssueRow } from './issue-columns';
import { ViewToggle } from '@/components/view-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IssueReportDialog } from '@/components/issues/issue-report-dialog';
import { IssueEditForm } from './[id]/issue-edit-form';
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

/** Get the primary (first) episode from an issue's episodes array */
function getPrimaryEpisode(episodes: IssueRow['episodes']) {
  if (episodes.length === 0) return null;
  const sorted = [...episodes].sort((a, b) => {
    const sDiff = a.episode.season.seasonNumber - b.episode.season.seasonNumber;
    if (sDiff !== 0) return sDiff;
    return a.episode.episodeNumber - b.episode.episodeNumber;
  });
  return sorted[0].episode;
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueRow | null>(null);

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

  // Delete: open confirmation dialog
  const handleDelete = useCallback((issueId: number) => {
    setDeleteConfirmId(issueId);
  }, []);

  // Delete: confirmed
  const confirmDelete = useCallback(async () => {
    if (deleteConfirmId === null) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/issues/${deleteConfirmId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete issue');
      }

      setIssues((prev) => prev.filter((i) => i.id !== deleteConfirmId));
      toast.success('Issue deleted');
      refreshCounts();
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete issue');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmId, refreshCounts]);

  // Build columns
  const columns = useMemo(
    () =>
      getIssueColumns({
        isAdmin,
        authMode,
        currentUserId: user?.id ?? null,
        dateFormat,
        onStatusChange: handleStatusChange,
        onDelete: handleDelete,
      }),
    [isAdmin, authMode, user?.id, dateFormat, handleStatusChange, handleDelete]
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
          action={<IssueReportDialog onSubmitted={fetchIssues} />}
          className="mb-0"
        />

        {/* Status Filter Chips + View Toggle */}
        <div className="flex items-center gap-1.5 md:gap-3 mt-4">
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
          <div className="space-y-2">
            {filteredIssues.map((issue) => {
              const ep = getPrimaryEpisode(issue.episodes);
              const isOwner = user?.id !== undefined && issue.user?.id === user.id;
              const canEdit = isOwner && issue.status === 'OPEN';
              const canDelete = isAdmin || (isOwner && issue.status === 'OPEN');
              const TypeIcon = ISSUE_TYPE_ICONS[issue.type];

              return (
                <Card key={issue.id} className="p-0">
                  <CardContent className="px-4 py-3">
                    {/* Row 1: Issue # + episode info + status + actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-x-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Issue number */}
                        <Link
                          href={`/issues/${issue.id}`}
                          className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          #{issue.id}
                        </Link>

                        {/* Episode / show info + type badges */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/issues/${issue.id}`}
                            className="hover:text-primary transition-colors min-w-0"
                          >
                            {ep ? (
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className="text-sm font-medium truncate">{ep.season.tvShow.title}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  S{String(ep.season.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                                  {issue.episodes.length > 1 && ` +${issue.episodes.length - 1}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No linked episodes</span>
                            )}
                          </Link>
                          <Badge variant={getIssueTypeVariant(issue.type)}>
                            <TypeIcon className="size-3 mr-0.5" />
                            {ISSUE_TYPE_LABELS[issue.type]}
                          </Badge>
                          {issue.subType && (
                            <Badge variant="outline">
                              {ISSUE_SUB_TYPE_LABELS[issue.subType as IssueSubType]}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Status + actions — right side */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-6 md:pl-0">
                        {isAdmin ? (() => {
                          const StatusIcon = ISSUE_STATUS_ICONS[issue.status];
                          return (
                            <BadgeSelector
                              value={issue.status}
                              options={ISSUE_STATUSES.map((s) => ({
                                value: s,
                                label: ISSUE_STATUS_LABELS[s],
                              }))}
                              displayLabel={ISSUE_STATUS_LABELS[issue.status]}
                              variant={getIssueStatusVariant(issue.status)}
                              getVariant={getIssueStatusVariant}
                              getIcon={(s) => {
                                const Icon = ISSUE_STATUS_ICONS[s as IssueStatus];
                                return <Icon className="size-3 mr-0.5" />;
                              }}
                              onValueChange={async (newStatus) => {
                                await handleStatusChange(issue.id, newStatus as IssueStatus);
                              }}
                              icon={<StatusIcon className="size-3 mr-0.5" />}
                            />
                          );
                        })() : (() => {
                          const StatusIcon = ISSUE_STATUS_ICONS[issue.status];
                          return (
                            <Badge variant={getIssueStatusVariant(issue.status)}>
                              <StatusIcon className="size-3 mr-0.5" />
                              {ISSUE_STATUS_LABELS[issue.status]}
                            </Badge>
                          );
                        })()}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingIssue(issue)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-destructive-foreground"
                            onClick={() => handleDelete(issue.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Context badges (optional) */}
                    {(issue.platform || issue.audioLang || issue.subtitleLang) && (
                      <div className="flex items-center gap-1 mt-1.5 pl-6 md:pl-9">
                        {issue.platform && (
                          <Badge variant="outline">
                            {issue.platform}
                          </Badge>
                        )}
                        {issue.audioLang && (
                          <Badge variant="outline">
                            <Volume2 className="size-3 mr-0.5" />
                            {issue.audioLang}
                          </Badge>
                        )}
                        {issue.subtitleLang && (
                          <Badge variant="outline">
                            <Captions className="size-3 mr-0.5" />
                            {issue.subtitleLang}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Row 3: Description (optional) */}
                    {issue.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1 pl-6 md:pl-9">
                        {issue.description}
                      </p>
                    )}

                    {/* Row 4: Reporter + date (compact) */}
                    <div className="flex items-center gap-2 mt-1.5 pl-6 md:pl-9">
                      {authMode === 'plex' && issue.user && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {issue.user.thumbUrl ? (
                            <img src={issue.user.thumbUrl} alt="" className="size-3.5 rounded-full" />
                          ) : (
                            <User className="size-3" />
                          )}
                          {issue.user.username}
                        </span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue #{deleteConfirmId}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this issue and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Issue Dialog */}
      <Dialog open={editingIssue !== null} onOpenChange={(open) => { if (!open) setEditingIssue(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Issue #{editingIssue?.id}</DialogTitle>
            <DialogDescription>Update the issue details.</DialogDescription>
          </DialogHeader>
          {editingIssue && (
            <IssueEditForm
              issue={{
                id: editingIssue.id,
                type: editingIssue.type,
                description: editingIssue.description,
                platform: editingIssue.platform,
                audioLang: editingIssue.audioLang,
                subtitleLang: editingIssue.subtitleLang,
                subType: editingIssue.subType,
                episodes: editingIssue.episodes.map((e) => ({ episodeId: e.episodeId })),
              }}
              onSaved={() => {
                setEditingIssue(null);
                fetchIssues();
              }}
              onCancel={() => setEditingIssue(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
