'use client';

/**
 * ScanHelpDialog - Explains how the scanning process works
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
import { FolderOpen, FileVideo, CheckCircle2, HelpCircle } from 'lucide-react';

interface ScanHelpDialogProps {
  tvShowsPath?: string;
  moviesPath?: string;
}

export function ScanHelpDialog({ tvShowsPath, moviesPath }: ScanHelpDialogProps) {
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
            How Scanning Works
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Configured Paths */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FolderOpen className="size-4" />
              Configured Directories
            </h4>
            <div className="space-y-1 text-sm">
              {tvShowsPath ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">TV Shows</Badge>
                  <code className="text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                    {tvShowsPath}
                  </code>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  TV_SHOWS_PATH not configured
                </p>
              )}
              {moviesPath && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Movies</Badge>
                  <code className="text-muted-foreground bg-muted px-2 py-0.5 rounded text-xs">
                    {moviesPath}
                  </code>
                  <span className="text-xs text-muted-foreground">(coming soon)</span>
                </div>
              )}
            </div>
          </div>

          {/* Scan Phases */}
          <div>
            <h4 className="font-medium mb-2">Scan Phases</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Discovering</strong> — Finds all media files (.mkv, .mp4, .avi, etc.)</li>
              <li><strong className="text-foreground">Parsing</strong> — Extracts show name, season, and episode from filenames</li>
              <li><strong className="text-foreground">Saving</strong> — Creates or updates shows, seasons, episodes, and files in the database</li>
              <li><strong className="text-foreground">Cleanup</strong> — Marks files that no longer exist on disk</li>
            </ol>
          </div>

          {/* Naming Conventions */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileVideo className="size-4" />
              Supported Naming Conventions
            </h4>
            <div className="space-y-2 text-sm">
              <div className="bg-muted rounded-md p-3 space-y-1 font-mono text-xs">
                <p className="text-muted-foreground"># Plex-style (recommended)</p>
                <p>TV Shows/Show Name (2020)/Season 01/Show Name - S01E05 - Title.mkv</p>
              </div>
              <div className="bg-muted rounded-md p-3 space-y-1 font-mono text-xs">
                <p className="text-muted-foreground"># Standard SxxExx</p>
                <p>Show.Name.S01E05.Episode.Title.1080p.BluRay.mkv</p>
              </div>
              <div className="bg-muted rounded-md p-3 space-y-1 font-mono text-xs">
                <p className="text-muted-foreground"># Alternative XxYY</p>
                <p>Show Name 1x05.mkv</p>
              </div>
            </div>
          </div>

          {/* What Happens */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              What Happens After a Scan
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>New shows are created with <Badge variant="secondary" className="text-xs mx-1">Wanted</Badge> status</li>
              <li>New files are added with <Badge variant="warning" className="text-xs mx-1">Unverified</Badge> quality</li>
              <li>Existing files are updated with new file size and modification date</li>
              <li>Missing files (deleted from disk) are flagged but not removed from database</li>
              <li>Match shows to TMDB to enrich with posters, descriptions, and air dates</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
