'use client';

/**
 * FFprobe Integration page
 * Configuration status and analysis statistics
 */

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileSearch,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { FfprobeHelpDialog } from './ffprobe-help-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { AdminGuard } from '@/components/admin-guard';
import { useTasks } from '@/lib/contexts/task-context';

interface FFprobeStatus {
  configured: boolean;
  available: boolean;
  version: string | null;
  path: string;
  error: string | null;
  files: {
    total: number;
    analyzed: number;
    failed: number;
    pending: number;
  };
}

export default function FfprobeIntegrationPage() {
  const { tasks, refresh: refreshTasks } = useTasks();
  const [status, setStatus] = useState<FFprobeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const [reanalyze, setReanalyze] = useState(false);

  // Check for active bulk analyze task (library-level has no title)
  const activeBulkTask = tasks.find(
    (t) =>
      t.type === 'ffprobe-bulk-analyze' &&
      (t.status === 'running' || t.status === 'pending') &&
      !t.title
  );
  const isBulkActive = !!activeBulkTask;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const response = await fetch('/api/ffprobe/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleBulkAnalyze = useCallback(async () => {
    setStartingAnalysis(true);
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
      setStartingAnalysis(false);
    }
  }, [refreshTasks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate percentage
  const analysisPercent = status?.files.total
    ? Math.round((status.files.analyzed / status.files.total) * 100)
    : 0;

  // Loading skeleton
  if (loading) {
    return (
      <AdminGuard>
      <PageContainer maxWidth="wide">
        <PageHeader
          title="FFprobe Integration"
          description="Analyze media files to extract detailed quality information"
          breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'FFprobe' }]}
        />

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </PageContainer>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
    <PageContainer maxWidth="wide">
      {/* Header */}
      <PageHeader
        title="FFprobe Integration"
        description="Analyze media files to extract detailed quality information"
        breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'FFprobe' }]}
        info={<FfprobeHelpDialog />}
        action={
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive mb-6 md:mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive-foreground">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Configuration
            {status?.available ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3 mr-1" />
                Connected
              </Badge>
            ) : status?.configured ? (
              <Badge variant="destructive">
                <AlertCircle className="size-3 mr-1" />
                Error
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircle className="size-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>FFprobe binary status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.available ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Version:</span>{' '}
                <code className="px-1 py-0.5 rounded bg-muted">{status.version || 'Unknown'}</code>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Path:</span>{' '}
                <code className="px-1 py-0.5 rounded bg-muted">{status.path}</code>
              </p>
            </div>
          ) : status?.configured ? (
            // Configured but not working
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-destructive-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive-foreground">FFprobe configuration error</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {status.error || 'Unknown error'}
                    </p>
                    {status.path && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Configured path:</span>{' '}
                        <code className="px-1 py-0.5 rounded bg-muted">{status.path}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Verify the file exists at the specified path</li>
                  <li>Check that the file has execute permissions</li>
                  <li>Ensure the path points to ffprobe, not ffmpeg</li>
                  <li>Try running <code className="px-1 py-0.5 rounded bg-muted">ffprobe -version</code> manually</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-sm mb-2">Common paths:</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Linux: <code className="px-1 py-0.5 rounded bg-muted">/usr/bin/ffprobe</code></p>
                  <p>macOS (Homebrew, Apple Silicon): <code className="px-1 py-0.5 rounded bg-muted">/opt/homebrew/bin/ffprobe</code></p>
                  <p>macOS (Homebrew, Intel): <code className="px-1 py-0.5 rounded bg-muted">/usr/local/bin/ffprobe</code></p>
                  <p>Docker (Alpine): <code className="px-1 py-0.5 rounded bg-muted">/usr/bin/ffprobe</code></p>
                </div>
              </div>
            </div>
          ) : (
            // Not configured
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                FFprobe is not configured. To use media analysis, you need to set up ffprobe:
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Step 1: Install ffmpeg (includes ffprobe)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Linux:</span>
                      <code className="px-2 py-1 rounded bg-muted">apt install ffmpeg</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Terminal className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">macOS:</span>
                      <code className="px-2 py-1 rounded bg-muted">brew install ffmpeg</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Terminal className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Docker:</span>
                      <span className="text-muted-foreground">Extend the image (see below)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Step 2: Set the environment variable</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">Add to your <code className="px-1 py-0.5 rounded bg-muted">.env</code> file or Docker environment:</p>
                    <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
{`# Linux / Docker
FFPROBE_PATH=/usr/bin/ffprobe

# macOS (Homebrew, Apple Silicon)
FFPROBE_PATH=/opt/homebrew/bin/ffprobe

# macOS (Homebrew, Intel)
FFPROBE_PATH=/usr/local/bin/ffprobe`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Docker: Extend the image</h4>
                  <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
{`# Dockerfile.custom
FROM curatr:latest
RUN apk add --no-cache ffmpeg`}
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  For more information, visit{' '}
                  <a
                    href="https://ffmpeg.org/download.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    ffmpeg.org
                    <ExternalLink className="size-3" />
                  </a>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Statistics */}
      {status?.available && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Statistics</CardTitle>
            <CardDescription>Media file analysis progress across your library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Files Analyzed</span>
                <span>
                  {status.files.analyzed} / {status.files.total}{' '}
                  <span className="text-muted-foreground">({analysisPercent}%)</span>
                </span>
              </div>
              <Progress value={analysisPercent} className="h-2" />
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{status.files.total}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{status.files.analyzed}</div>
                <div className="text-sm text-muted-foreground">Analyzed</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{status.files.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{status.files.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Bulk analyze action */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <FileSearch className="size-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <p className="font-medium">Analyze files</p>
                  <p className="text-muted-foreground mt-1">
                    Analyze individual files from episode pages, or use the button below
                    to analyze all pending files at once.
                  </p>
                  <div className="mt-3">
                    <Dialog open={analyzeDialogOpen} onOpenChange={(v) => { setAnalyzeDialogOpen(v); if (!v) setReanalyze(false); }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          disabled={(status.files.pending === 0 && !isBulkActive) || isBulkActive}
                        >
                          {isBulkActive ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                          ) : (
                            <FileSearch className="size-4 mr-2" />
                          )}
                          {isBulkActive
                            ? 'Analyzing...'
                            : status.files.pending === 0
                              ? 'All Analyzed'
                              : `Analyze All (${status.files.pending} pending)`}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Analyze Files</DialogTitle>
                          <DialogDescription>
                            Run FFprobe analysis on files across your library.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            This may take a while for large libraries. Each file will be
                            analyzed sequentially. You can monitor progress from the Tasks page
                            and cancel at any time.
                          </p>

                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor="reanalyze-library" className="text-sm cursor-pointer">
                              Re-analyze previously analyzed files
                            </Label>
                            <Switch
                              id="reanalyze-library"
                              checked={reanalyze}
                              onCheckedChange={setReanalyze}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAnalyzeDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleBulkAnalyze} disabled={startingAnalysis}>
                            {startingAnalysis ? (
                              <>
                                <Loader2 className="size-4 mr-1 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <FileSearch className="size-4 mr-1" />
                                Start Analysis
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
    </AdminGuard>
  );
}
