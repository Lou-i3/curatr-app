'use client';

/**
 * Files Page — lists all episode files with quality/action management,
 * card/table views, filtering, and admin actions (analyze, rescan)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search as SearchIcon,
  Loader2,
  FileSearch,
} from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTasks } from '@/lib/contexts/task-context';
import {
  FILE_QUALITY_LABELS,
  FILE_QUALITY_OPTIONS,
  ACTION_LABELS,
  ACTION_OPTIONS,
  PLAYBACK_STATUS_LABELS,
  PLAYBACK_STATUS_OPTIONS,
  getFileQualityVariant,
  getActionVariant,
  getPlaybackStatusVariant,
} from '@/lib/status';
import {
  formatDateTimeWithFormat,
  formatFileSize,
} from '@/lib/settings-shared';
import type { DateFormat } from '@/lib/settings-shared';
import type { FileQuality, Action, PlaybackStatus } from '@/generated/prisma/client';
import { BadgeSelector } from '@/components/badge-selector';
import { getFileColumns, type FileRow, type PlatformInfo } from './file-columns';
import { FilesToolbar } from './files-toolbar';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';
import { AdminGuard } from '@/components/admin-guard';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { Table as TableInstance } from '@tanstack/react-table';

function TableRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
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
            <Skeleton className="size-7" />
          </div>
        </div>
        <Skeleton className="h-5 w-64 mb-1" />
        <Skeleton className="h-4 w-48 mb-3" />
        <div className="flex flex-wrap gap-2 mb-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function FilesPage() {
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();
  const { tasks, refresh: refreshTasks } = useTasks();

  const isScanning = tasks.some(
    (t) =>
      (t.type === 'scan' || t.type === 'show-scan') &&
      (t.status === 'running' || t.status === 'pending')
  );

  const isBulkAnalyzing = tasks.some(
    (t) =>
      t.type === 'ffprobe-bulk-analyze' &&
      (t.status === 'running' || t.status === 'pending') &&
      !t.title
  );

  const currentView = searchParams.get('view') ?? 'cards';
  const isTableView = currentView === 'table';

  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
  const [tableInstance, setTableInstance] = useState<TableInstance<FileRow> | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [rescanningId, setRescanningId] = useState<number | null>(null);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [startingBulkAnalysis, setStartingBulkAnalysis] = useState(false);
  const [reanalyze, setReanalyze] = useState(false);

  // Build query string from search params for API call
  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const quality = searchParams.get('quality');
    const action = searchParams.get('action');
    const fileExists = searchParams.get('fileExists');
    const analyzed = searchParams.get('analyzed');
    const playback = searchParams.get('playback');

    if (q) params.set('q', q);
    if (quality && quality !== 'all') params.set('quality', quality);
    if (action && action !== 'all') params.set('action', action);
    if (fileExists && fileExists !== 'all') params.set('fileExists', fileExists);
    if (analyzed && analyzed !== 'all') params.set('analyzed', analyzed);
    if (playback && playback !== 'all') params.set('playback', playback);

    return params.toString();
  }, [searchParams]);

  // Fetch settings for date format
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setDateFormat(s.dateFormat || 'EU'))
      .catch(() => {});
  }, []);

  // Platforms for playback test columns
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  // Infinite scroll data fetching
  const parseFilesResponse = useCallback(
    (json: Record<string, unknown>) => ({
      data: json.data as FileRow[],
      total: json.total as number,
      meta: { platforms: json.platforms as PlatformInfo[] },
    }),
    []
  );

  const {
    items: files,
    setItems: setFiles,
    total,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    meta,
    refresh,
  } = useInfiniteScroll<FileRow>({
    apiUrl: '/api/files',
    apiQuery,
    limit: 200,
    parseResponse: parseFilesResponse,
  });

  // Extract platforms from API response (stable after first load)
  useEffect(() => {
    if (meta?.platforms) {
      setPlatforms(meta.platforms as PlatformInfo[]);
    }
  }, [meta]);

  // Quality change handler
  const handleQualityChange = useCallback(async (fileId: number, quality: FileQuality) => {
    const response = await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    });

    if (!response.ok) {
      toast.error('Failed to update quality');
      throw new Error('Failed to update');
    }

    // Optimistic update
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, quality } : f))
    );
  }, []);

  // Action change handler
  const handleActionChange = useCallback(async (fileId: number, action: Action) => {
    const response = await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      toast.error('Failed to update action');
      throw new Error('Failed to update');
    }

    // Optimistic update
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, action } : f))
    );
  }, []);

  // Playback status change handler (create or update)
  const handlePlaybackStatusChange = useCallback(async (
    fileId: number, platformId: number, testId: number | null, status: PlaybackStatus
  ) => {
    if (testId) {
      // Update existing test
      const response = await fetch(`/api/playback-tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        toast.error('Failed to update playback test');
        throw new Error('Failed to update');
      }
    } else {
      // Create new test
      const response = await fetch('/api/playback-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeFileId: fileId, platformId, status }),
      });
      if (!response.ok) {
        toast.error('Failed to create playback test');
        throw new Error('Failed to create');
      }
    }

    // Refresh to get updated test data and recomputed quality
    await refresh();
  }, [refresh]);

  // Analyze handler
  const handleAnalyze = useCallback(async (fileId: number) => {
    setAnalyzingId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start analysis');
      }

      const result = await response.json();

      if (result.status === 'completed') {
        toast.success('Analysis complete');
        // Silently refresh to get updated media info (codec, resolution, etc.)
        await refresh();
      } else {
        toast.success('Analysis queued');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze file');
    } finally {
      setAnalyzingId(null);
    }
  }, [refresh]);

  // Rescan handler
  const handleRescan = useCallback(async (fileId: number) => {
    setRescanningId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}/rescan`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to rescan file');
      }

      const result = await response.json();

      toast.success(
        result.fileExists ? 'File verified on disk' : 'File not found on disk'
      );

      // Silently refresh to get updated file data
      await refresh();
    } catch {
      toast.error('Failed to rescan file');
    } finally {
      setRescanningId(null);
    }
  }, [refresh]);

  // Scan library handler
  const handleScanLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType: 'full' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start scan');
      }

      toast.success('Library scan started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start scan');
    }
  }, []);

  // Bulk analyze handler
  const handleBulkAnalyze = useCallback(async () => {
    setStartingBulkAnalysis(true);
    try {
      const response = await fetch('/api/ffprobe/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'library', reanalyze }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start analysis');
      }

      setAnalyzeDialogOpen(false);
      setReanalyze(false);

      if (data.total === 0) {
        toast.info('All files already analyzed');
      } else if (data.status === 'pending') {
        toast.success(`Analysis queued for ${data.total} files`);
      } else {
        toast.success(`Analyzing ${data.total} files...`);
      }

      await refreshTasks();
    } catch (err) {
      setAnalyzeDialogOpen(false);
      toast.error(err instanceof Error ? err.message : 'Failed to start analysis');
    } finally {
      setStartingBulkAnalysis(false);
    }
  }, [refreshTasks]);

  // Build columns
  const columns = useMemo(
    () =>
      getFileColumns({
        isAdmin,
        dateFormat,
        platforms,
        onQualityChange: handleQualityChange,
        onActionChange: handleActionChange,
        onPlaybackStatusChange: handlePlaybackStatusChange,
        onAnalyze: handleAnalyze,
        onRescan: handleRescan,
        analyzingId,
        rescanningId,
      }),
    [isAdmin, dateFormat, platforms, handleQualityChange, handleActionChange, handlePlaybackStatusChange, handleAnalyze, handleRescan, analyzingId, rescanningId]
  );

  // Initial column visibility — hide container and per-platform columns by default
  const initialColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = { container: false };
    for (const platform of platforms) {
      visibility[`platform-${platform.id}`] = false;
    }
    return visibility;
  }, [platforms]);

  return (
    <AdminGuard>
    <PageContainer maxWidth="wide">
      {/* Sticky Header */}
      <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <PageHeader
          title={`Files ${!loading ? `(${total})` : ''}`}
          description="Browse and manage all episode files across your library"
          breadcrumbs={[{ label: 'Files' }]}
          className="mb-0"
          action={isAdmin ? (
            <div className="flex items-center gap-2">
              <Dialog open={analyzeDialogOpen} onOpenChange={(v) => { setAnalyzeDialogOpen(v); if (!v) setReanalyze(false); }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBulkAnalyzing}
                  >
                    {isBulkAnalyzing ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <FileSearch className="size-4 mr-2" />
                    )}
                    {isBulkAnalyzing ? 'Analyzing...' : 'Analyze All'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Analyze All Files</DialogTitle>
                    <DialogDescription>
                      Run FFprobe analysis on files in your library.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This will extract video, audio, and subtitle track information.
                      You can monitor progress from the Tasks page.
                    </p>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="reanalyze-files" className="text-sm cursor-pointer">
                        Re-analyze previously analyzed files
                      </Label>
                      <Switch
                        id="reanalyze-files"
                        checked={reanalyze}
                        onCheckedChange={setReanalyze}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAnalyzeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAnalyze} disabled={startingBulkAnalysis}>
                      {startingBulkAnalysis ? (
                        <>
                          <Loader2 className="size-4 mr-1 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <FileSearch className="size-4 mr-1" />
                          Analyze All
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanLibrary}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="size-4 mr-2" />
                )}
                {isScanning ? 'Scanning...' : 'Scan Library'}
              </Button>
            </div>
          ) : undefined}
        />

        {/* Toolbar */}
        <div className="mt-4">
          <FilesToolbar table={isTableView ? tableInstance : null} />
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
                      <TableHead>Filename</TableHead>
                      <TableHead>Show / Episode</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Codec</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>On Disk</TableHead>
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
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-1">No files found.</p>
              <p className="text-sm text-muted-foreground">
                {apiQuery
                  ? 'Try adjusting your filters.'
                  : 'Run a scan to discover files in your library.'}
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
                  data={files}
                  onTableReady={setTableInstance}
                  initialColumnVisibility={initialColumnVisibility}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Card View */
          <div className="space-y-4 md:space-y-6">
            {files.map((file) => {
              const ep = file.episode;
              const epLabel = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;

              return (
                <Card key={file.id} className="p-0">
                  <CardContent className="p-4 md:p-6">
                    {/* Top row: badges + actions */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        {isAdmin ? (
                          <>
                            <BadgeSelector
                              value={file.quality}
                              options={FILE_QUALITY_OPTIONS}
                              displayLabel={FILE_QUALITY_LABELS[file.quality]}
                              variant={getFileQualityVariant(file.quality)}
                              getVariant={getFileQualityVariant}
                              onValueChange={async (v) => {
                                await handleQualityChange(file.id, v as FileQuality);
                              }}
                            />
                            <BadgeSelector
                              value={file.action}
                              options={ACTION_OPTIONS}
                              displayLabel={ACTION_LABELS[file.action]}
                              variant={getActionVariant(file.action)}
                              getVariant={getActionVariant}
                              onValueChange={async (v) => {
                                await handleActionChange(file.id, v as Action);
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <Badge variant={getFileQualityVariant(file.quality)}>
                              {FILE_QUALITY_LABELS[file.quality]}
                            </Badge>
                            <Badge variant={getActionVariant(file.action)}>
                              {ACTION_LABELS[file.action]}
                            </Badge>
                          </>
                        )}
                        {file.hdrType && (
                          <Badge variant="secondary">{file.hdrType}</Badge>
                        )}
                        {file.overallPlaybackStatus && (
                          <Badge variant={getPlaybackStatusVariant(file.overallPlaybackStatus)}>
                            {PLAYBACK_STATUS_LABELS[file.overallPlaybackStatus]}
                          </Badge>
                        )}
                        {!file.fileExists && (
                          <Badge variant="destructive">Missing</Badge>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleAnalyze(file.id)}
                                  disabled={!file.fileExists || analyzingId === file.id}
                                >
                                  {analyzingId === file.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <SearchIcon className="size-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Analyze with FFprobe</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleRescan(file.id)}
                                  disabled={rescanningId === file.id}
                                >
                                  {rescanningId === file.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="size-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Re-scan file on disk</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>

                    {/* Filename */}
                    <Link
                      href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
                      className="hover:underline"
                    >
                      <p className="font-medium text-sm truncate">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {ep.season.tvShow.title} — {epLabel}{ep.title ? ` — ${ep.title}` : ''}
                      </p>
                    </Link>

                    {/* Technical info */}
                    {(file.codec || file.resolution || file.container) && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {file.codec && (
                          <Badge variant="outline" className="text-xs">{file.codec}</Badge>
                        )}
                        {file.resolution && (
                          <Badge variant="outline" className="text-xs">{file.resolution}</Badge>
                        )}
                        {file.container && (
                          <Badge variant="outline" className="text-xs">{file.container}</Badge>
                        )}
                        {file.audioFormat && (
                          <Badge variant="outline" className="text-xs">{file.audioFormat}</Badge>
                        )}
                      </div>
                    )}

                    {/* Playback test status per platform */}
                    {(isAdmin || Object.keys(file.playbackTests).length > 0) && platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {platforms.map((p) => {
                          const test = file.playbackTests[String(p.id)];
                          if (!test && !isAdmin) return null;
                          const pLabel = p.isRequired ? `${p.name} *` : p.name;
                          if (isAdmin) {
                            return (
                              <span key={p.id} className="inline-flex items-center gap-1">
                                <BadgeSelector
                                  value={test?.status ?? ('' as PlaybackStatus)}
                                  options={PLAYBACK_STATUS_OPTIONS}
                                  displayLabel={test ? `${pLabel}: ${PLAYBACK_STATUS_LABELS[test.status]}` : `${pLabel}: —`}
                                  variant={test ? getPlaybackStatusVariant(test.status) : 'outline'}
                                  getVariant={getPlaybackStatusVariant}
                                  className="text-xs"
                                  onValueChange={async (v) => {
                                    await handlePlaybackStatusChange(file.id, p.id, test?.id ?? null, v as PlaybackStatus);
                                  }}
                                />
                                {test?.notes && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-xs text-muted-foreground italic max-w-[120px] truncate">
                                          {test.notes}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <p className="text-xs">{test.notes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </span>
                            );
                          }
                          return (
                            <span key={p.id} className="inline-flex items-center gap-1">
                              <Badge
                                variant={getPlaybackStatusVariant(test!.status)}
                                className="text-xs"
                              >
                                {pLabel}: {PLAYBACK_STATUS_LABELS[test!.status]}
                              </Badge>
                              {test!.notes && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-xs text-muted-foreground italic max-w-[120px] truncate">
                                        {test!.notes}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <p className="text-xs">{test!.notes}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer: size + date + counts */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(BigInt(file.fileSize))}
                        </span>
                        {file.issueCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {file.issueCount} issue{file.issueCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeWithFormat(new Date(file.dateModified), dateFormat)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Scroll sentinel for infinite scroll */}
        {!loading && files.length > 0 && hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more files...
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
    </AdminGuard>
  );
}
