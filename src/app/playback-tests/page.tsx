'use client';

/**
 * Playback Tests Page — lists all playback tests with status filters,
 * card/table views, and admin actions (inline status editing, edit, delete)
 * Uses infinite scroll pagination (200 items per batch)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
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
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  PLAYBACK_STATUS_LABELS,
  PLAYBACK_STATUS_OPTIONS,
  getPlaybackStatusVariant,
} from '@/lib/status';
import { formatDateTimeWithFormat } from '@/lib/settings-shared';
import type { DateFormat } from '@/lib/settings-shared';
import type { PlaybackStatus } from '@/generated/prisma/client';
import { BadgeSelector } from '@/components/badge-selector';
import { EditTestDialog, type EditableTest } from '@/components/playback-tests/edit-test-dialog';
import { getPlaybackTestColumns, type PlaybackTestRow } from './playback-test-columns';
import { PlaybackTestsToolbar } from './playback-tests-toolbar';
import { AddTestDialog } from './add-test-dialog';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { Table as TableInstance } from '@tanstack/react-table';

function TableRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
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
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="size-7" />
            <Skeleton className="size-7" />
          </div>
        </div>
        <Skeleton className="h-5 w-48 mb-1" />
        <Skeleton className="h-4 w-64 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlaybackTestsPage() {
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const currentView = searchParams.get('view') ?? 'cards';
  const isTableView = currentView === 'table';

  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
  const [tableInstance, setTableInstance] = useState<TableInstance<PlaybackTestRow> | null>(null);

  // Edit dialog state
  const [editingTest, setEditingTest] = useState<EditableTest | null>(null);

  // Delete confirmation state
  const [deleteTestId, setDeleteTestId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build query string from search params for API call
  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const status = searchParams.get('status');
    const platformId = searchParams.get('platformId');

    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    if (platformId && platformId !== 'all') params.set('platformId', platformId);

    return params.toString();
  }, [searchParams]);

  // Fetch settings for date format
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setDateFormat(s.dateFormat || 'EU'))
      .catch(() => {});
  }, []);

  // Infinite scroll data fetching
  const parseTestsResponse = useCallback(
    (json: Record<string, unknown>) => ({
      data: json.data as PlaybackTestRow[],
      total: json.total as number,
      meta: json.counts as Record<string, unknown>,
    }),
    []
  );

  const {
    items: tests,
    setItems: setTests,
    total,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    meta: statusCounts,
    refetch: fetchTests,
  } = useInfiniteScroll<PlaybackTestRow>({
    apiUrl: '/api/playback-tests',
    apiQuery,
    limit: 200,
    parseResponse: parseTestsResponse,
  });

  // Status change handler (inline)
  const handleStatusChange = useCallback(async (testId: number, status: PlaybackStatus) => {
    const response = await fetch(`/api/playback-tests/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      toast.error('Failed to update status');
      throw new Error('Failed to update');
    }

    // Optimistic update
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status } : t))
    );
  }, [setTests]);

  // Edit handler — open shared EditTestDialog
  const handleEdit = useCallback((test: PlaybackTestRow) => {
    setEditingTest({
      id: test.id,
      status: test.status,
      notes: test.notes,
      testedAt: test.testedAt,
      platformName: test.platform.name,
    });
  }, []);

  // Edit saved handler
  const handleEditSaved = useCallback(() => {
    setEditingTest(null);
    fetchTests();
  }, [fetchTests]);

  // Delete handler
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTestId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/playback-tests/${deleteTestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete test');

      setTests((prev) => prev.filter((t) => t.id !== deleteTestId));
      toast.success('Test deleted');
    } catch {
      toast.error('Failed to delete test');
    } finally {
      setDeleting(false);
      setDeleteTestId(null);
    }
  }, [deleteTestId, setTests]);

  // Default status counts fallback
  const defaultCounts = { all: 0, PASS: 0, PARTIAL: 0, FAIL: 0 };

  // Build columns
  const columns = useMemo(
    () =>
      getPlaybackTestColumns({
        isAdmin,
        dateFormat,
        onStatusChange: handleStatusChange,
        onEdit: handleEdit,
        onDelete: setDeleteTestId,
      }),
    [isAdmin, dateFormat, handleStatusChange, handleEdit]
  );

  return (
    <PageContainer maxWidth="wide">
      {/* Sticky Header */}
      <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <PageHeader
          title={`Playback Tests ${!loading ? `(${total})` : ''}`}
          description="Track playback compatibility across platforms"
          breadcrumbs={[{ label: 'Playback Tests' }]}
          action={isAdmin ? <AddTestDialog onAdded={fetchTests} /> : undefined}
          className="mb-0"
        />

        {/* Toolbar */}
        <div className="mt-4">
          <PlaybackTestsToolbar
            table={isTableView ? tableInstance : null}
            statusCounts={(statusCounts as Record<string, number>) ?? defaultCounts}
            loading={loading}
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
                      <TableHead>Show / Episode</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Tested At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
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
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-1">No playback tests found.</p>
              <p className="text-sm text-muted-foreground">
                {apiQuery
                  ? 'Try adjusting your filters.'
                  : 'Add playback tests from episode pages or using the Add Test button.'}
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
                  data={tests}
                  onTableReady={setTableInstance}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card View */
          <div className="space-y-4 md:space-y-6">
            {tests.map((test) => {
              const ep = test.episodeFile.episode;
              const epLabel = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;

              return (
                <Card key={test.id} className="p-0">
                  <CardContent className="p-4 md:p-6">
                    {/* Top row: badges + actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        {isAdmin ? (
                          <BadgeSelector
                            value={test.status}
                            options={PLAYBACK_STATUS_OPTIONS}
                            displayLabel={PLAYBACK_STATUS_LABELS[test.status]}
                            variant={getPlaybackStatusVariant(test.status)}
                            getVariant={getPlaybackStatusVariant}
                            onValueChange={async (v) => {
                              await handleStatusChange(test.id, v as PlaybackStatus);
                            }}
                          />
                        ) : (
                          <Badge variant={getPlaybackStatusVariant(test.status)}>
                            {PLAYBACK_STATUS_LABELS[test.status]}
                          </Badge>
                        )}
                        <Badge variant="outline">{test.platform.name}</Badge>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(test)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive-foreground"
                            onClick={() => setDeleteTestId(test.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Show / Episode info */}
                    <Link
                      href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
                      className="hover:underline"
                    >
                      <p className="font-medium text-sm">{ep.season.tvShow.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {epLabel}{ep.title ? ` — ${ep.title}` : ''}
                      </p>
                    </Link>

                    {/* Filename */}
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {test.episodeFile.filename}
                    </p>

                    {/* Notes */}
                    {test.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {test.notes}
                      </p>
                    )}

                    {/* Footer: date */}
                    <div className="flex items-center justify-end mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeWithFormat(new Date(test.testedAt), dateFormat)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Scroll sentinel for infinite scroll */}
        {!loading && tests.length > 0 && hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more tests...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared Edit Test Dialog */}
      {editingTest && (
        <EditTestDialog
          test={editingTest}
          open={!!editingTest}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingTest(null);
          }}
          onSaved={handleEditSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTestId !== null} onOpenChange={(open) => !open && setDeleteTestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playback Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this playback test? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
