'use client';

/**
 * TmdbHelpDialog - Explains how TMDB sync and import features work
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  HelpCircle,
  RefreshCw,
  Download,
  Link2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export function TmdbHelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <HelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="size-5" />
            TMDB Integration Help
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Match to TMDB */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Link2 className="size-4" />
              Match to TMDB
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Links your show to the correct entry in The Movie Database (TMDB).
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Search by show name to find the matching TMDB entry</li>
              <li>Confidence scores help identify the best match</li>
              <li>Once matched, you can sync metadata and import episodes</li>
              <li>Use &quot;Fix Match&quot; to correct a wrong match</li>
            </ul>
          </div>

          {/* Sync Metadata */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <RefreshCw className="size-4" />
              Sync Metadata
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Updates show information from TMDB. Use this to refresh details after TMDB updates.
            </p>

            <div className="space-y-3">
              {/* What gets updated */}
              <div className="bg-muted rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="size-4 text-success-foreground" />
                  <span className="text-sm font-medium">Always Updated</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground ml-6">
                  <li>Show title, description, and genres</li>
                  <li>Poster and backdrop images</li>
                  <li>First air date, status (Ended, Returning, etc.)</li>
                  <li>Vote average and vote count</li>
                  <li>Network and origin country</li>
                </ul>
              </div>

              {/* What's preserved */}
              <div className="bg-muted rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-yellow-500" />
                  <span className="text-sm font-medium">Preserved (Not Overwritten)</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground ml-6">
                  <li>Your monitor status (Wanted/Unwanted)</li>
                  <li>Your custom notes</li>
                  <li>Existing seasons and episodes</li>
                  <li>File associations and quality status</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Import Seasons & Episodes */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Download className="size-4" />
              Import Seasons & Episodes
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Create seasons and episodes in your database from TMDB data, even without files on disk.
            </p>

            <div className="space-y-3">
              {/* How it works */}
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-2">How It Works</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>Fetches all seasons and episodes from TMDB</li>
                  <li>Shows which already exist in your database</li>
                  <li>Select which ones to import</li>
                  <li>Choose monitor status (Wanted/Unwanted) for each</li>
                </ol>
              </div>

              {/* Visual indicators */}
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-2">Status Indicators</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success-foreground" />
                    <span className="text-success-foreground-foreground">
                      Exists with files — already in DB with media files
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full border-2 border-warning bg-warning" />
                    <span className="text-warning-foreground">
                      Exists without files — in DB but no files (missing)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full border-2 border-secondary bg-secondary" />
                      <span className="text-secondary-foreground">
                      Will be created — not in DB yet
                    </span>
                  </div>
                </div>
              </div>

              {/* Episode groups */}
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-2">Episode Groups (Order)</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Some shows have alternative episode orderings on TMDB:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                  <li><strong>Default (TMDB)</strong> — Standard broadcast order</li>
                  <li><strong>DVD Order</strong> — DVD release order</li>
                  <li><strong>Absolute Order</strong> — Sequential numbering (common for anime)</li>
                </ul>
              </div>

              {/* Matching */}
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm font-medium mb-2">Matching Existing Episodes</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Episode from TMDB</span>
                  <ArrowRight className="size-3" />
                  <span>Matches by season + episode number</span>
                  <ArrowRight className="size-3" />
                  <span>Updates metadata if exists</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h4 className="font-medium mb-2">Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                Import episodes as <Badge variant="secondary" className="text-xs mx-1">Wanted</Badge>
                to track what you&apos;re missing
              </li>
              <li>
                Mark episodes as <Badge variant="outline" className="text-xs mx-1">Unwanted</Badge>
                if you don&apos;t plan to collect them
              </li>
              <li>Sync metadata periodically to get updated posters and descriptions</li>
              <li>Use episode groups if your files follow a non-standard order</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
