'use client';

/**
 * TmdbIntegrationHelpDialog - Explains TMDB integration features and workflow
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
  Zap,
  RefreshCw,
  Link2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export function TmdbIntegrationHelpDialog() {
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
          {/* Status Explanations */}
          <div>
            <h4 className="font-medium mb-3">Understanding Status</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                <Badge variant="destructive" className="mt-0.5">
                  <XCircle className="size-3 mr-1" />
                  Not Matched
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Show is not linked to TMDB. Use &quot;Match&quot; to search and link it.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                <Badge variant="warning" className="mt-0.5">
                  <AlertTriangle className="size-3 mr-1" />
                  Needs Sync
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Show is matched but some seasons or episodes are missing TMDB metadata.
                  Use &quot;Sync&quot; to fetch the missing data.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2 rounded bg-muted/50">
                <Badge variant="success" className="mt-0.5">
                  <CheckCircle2 className="size-3 mr-1" />
                  Synced
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Show and all its seasons/episodes have TMDB metadata.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-medium mb-3">Bulk Actions</h4>
            <div className="space-y-3">
              <div className="p-3 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="size-4 text-primary" />
                  <span className="font-medium">Auto-Match Unmatched</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Searches TMDB for each unmatched show and automatically matches those with
                  high confidence (80%+). Shows with uncertain matches are skipped and can
                  be matched manually. <strong>Does not sync season/episode metadata</strong> —
                  run &quot;Refresh Missing&quot; afterward.
                </p>
              </div>

              <div className="p-3 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="size-4 text-warning-foreground" />
                  <span className="font-medium">Refresh Missing Metadata</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Syncs season and episode data <strong>only for shows that need it</strong> —
                  matched shows where some seasons or episodes are missing TMDB metadata.
                  Faster than refreshing everything.
                </p>
              </div>

              <div className="p-3 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="size-4" />
                  <span className="font-medium">Refresh All Metadata</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Re-fetches metadata for <strong>all matched shows</strong>, including
                  show details, seasons, and episodes. Use this periodically to catch
                  updates on TMDB (new posters, corrected descriptions, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Per-Show Actions */}
          <div>
            <h4 className="font-medium mb-3">Per-Show Actions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">Match</Badge>
                <span className="text-muted-foreground">
                  Opens a search dialog to find and link the show to TMDB.
                  Syncs show metadata and season/episode data immediately.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">Sync</Badge>
                <span className="text-muted-foreground">
                  Fetches missing season and episode metadata for a single show.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">View</Badge>
                <span className="text-muted-foreground">
                  Opens the show detail page for more options.
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Workflow */}
          <div>
            <h4 className="font-medium mb-3">Recommended Workflow</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Run <strong>&quot;Auto-Match Unmatched&quot;</strong> to match shows automatically
              </li>
              <li>
                Manually match any remaining unmatched shows (low confidence matches)
              </li>
              <li>
                Run <strong>&quot;Refresh Missing Metadata&quot;</strong> to sync all season/episode data
              </li>
              <li>
                Periodically run <strong>&quot;Refresh All&quot;</strong> to catch TMDB updates
              </li>
            </ol>
          </div>

          {/* Understanding the Stats */}
          <div>
            <h4 className="font-medium mb-3">Understanding the Stats</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Shows Matched</strong> — Shows linked to a TMDB ID
              </li>
              <li>
                <strong>Seasons with Metadata</strong> — Seasons that have a TMDB Season ID
              </li>
              <li>
                <strong>Episodes with Metadata</strong> — Episodes that have a TMDB Episode ID
              </li>
              <li>
                <strong>Needs Sync</strong> — Matched shows with unsynced children
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
