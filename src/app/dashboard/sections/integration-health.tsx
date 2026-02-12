'use client';

/**
 * Integration Health section — TMDB + FFprobe status
 * Admin only. Fetches integration status on mount.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Puzzle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface IntegrationHealthProps {
  tmdbMatchedCount: number;
  totalShows: number;
  analyzedFiles: number;
  totalFiles: number;
}

interface FfprobeStatus {
  available: boolean;
  path?: string;
}

export function IntegrationHealth({ tmdbMatchedCount, totalShows, analyzedFiles, totalFiles }: IntegrationHealthProps) {
  const [ffprobeStatus, setFfprobeStatus] = useState<FfprobeStatus | null>(null);
  const [ffprobeLoading, setFfprobeLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ffprobe/status')
      .then((r) => r.json())
      .then((data) => setFfprobeStatus({ available: data.available, path: data.path }))
      .catch(() => setFfprobeStatus({ available: false }))
      .finally(() => setFfprobeLoading(false));
  }, []);

  const tmdbPct = totalShows > 0 ? Math.round((tmdbMatchedCount / totalShows) * 100) : 0;
  const ffprobePct = totalFiles > 0 ? Math.round((analyzedFiles / totalFiles) * 100) : 0;

  return (
    <div className="space-y-4 mb-6 md:mb-8">
      <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
        <Puzzle className="size-5" />
        Integration Health
      </h2>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* TMDB */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">TMDB</CardTitle>
              <CardDescription>Metadata matching</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/integrations/tmdb">
                Manage
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {totalShows === 0 ? (
              <p className="text-sm text-muted-foreground">No shows in library</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {tmdbMatchedCount === totalShows ? (
                    <Badge variant="success" className="text-xs">All matched</Badge>
                  ) : tmdbMatchedCount > 0 ? (
                    <Badge variant="warning" className="text-xs">{totalShows - tmdbMatchedCount} unmatched</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not configured</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tmdbMatchedCount} of {totalShows} matched</span>
                    <span>{tmdbPct}%</span>
                  </div>
                  <Progress value={tmdbPct} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FFprobe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">FFprobe</CardTitle>
              <CardDescription>Media analysis</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/integrations/ffprobe">
                Manage
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {ffprobeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {ffprobeStatus?.available ? (
                    <Badge variant="success" className="text-xs gap-1">
                      <CheckCircle2 className="size-3" />
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <XCircle className="size-3" />
                      Not configured
                    </Badge>
                  )}
                </div>
                {totalFiles > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{analyzedFiles} of {totalFiles} analyzed</span>
                      <span>{ffprobePct}%</span>
                    </div>
                    <Progress value={ffprobePct} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
