/**
 * Shared help content for scan/sync operations
 * Used by ScanHelpDialog and ShowSyncButton to avoid documentation duplication
 */

import { Badge } from '@/components/ui/badge';

interface ScanHelpSectionProps {
  /** Show only sections relevant to single-show sync */
  compact?: boolean;
}

/**
 * Recognition logic section - explains how files are matched
 */
export function RecognitionHelpSection() {
  return (
    <div className="space-y-3 text-sm">
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Show Recognition</p>
        <p className="text-muted-foreground text-xs">
          Shows are identified by their <strong>folder name</strong> (e.g., &quot;Show Name (2020)&quot;).
          The folder name is stored and used to match files on future scans, even if you rename
          the show in the app. Year in parentheses is extracted if present.
        </p>
      </div>
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Season Recognition</p>
        <p className="text-muted-foreground text-xs">
          Seasons are detected from &quot;Season XX&quot; folders or from the SxxExx pattern in filenames.
          A &quot;Specials&quot; folder is treated as Season 0. If no season folder exists, the season
          number is extracted from the filename pattern.
        </p>
      </div>
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Episode Recognition</p>
        <p className="text-muted-foreground text-xs">
          Episode numbers are extracted from filename patterns: <code className="bg-muted px-1 rounded">S01E05</code>,{' '}
          <code className="bg-muted px-1 rounded">1x05</code>, or similar. Multi-episode files
          (e.g., S01E05E06) use the first episode number. Episode titles are extracted from
          Plex-style names after the episode number. Quality info (1080p, BluRay, etc.) is
          automatically stripped from titles.
        </p>
      </div>
    </div>
  );
}

/**
 * What gets updated section - explains data preservation rules
 */
export function UpdateRulesHelpSection({ compact }: ScanHelpSectionProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Always Updated from File System</p>
        <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
          <li>File size and modification date (when changed)</li>
          <li>Files marked as deleted if no longer on disk (not removed from database)</li>
        </ul>
      </div>
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Updated from Filenames (Only if Missing)</p>
        <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
          <li>Show year is filled in only if missing</li>
          <li>Episode titles are set only for new episodes (existing titles preserved)</li>
        </ul>
      </div>
      <div className="p-3 rounded border">
        <p className="font-medium mb-1">Never Changed by Scanning</p>
        <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
          <li>Show titles (rename via show page or TMDB sync)</li>
          <li>Existing episode titles (use TMDB sync to update)</li>
          <li>Monitor status, quality ratings, notes</li>
          {!compact && <li>TMDB metadata (posters, descriptions, air dates)</li>}
        </ul>
      </div>
    </div>
  );
}

/**
 * What happens after scan - results summary
 */
export function ScanResultsHelpSection() {
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
      <li>New shows are created with <Badge variant="secondary" className="text-xs mx-1">Wanted</Badge> status</li>
      <li>New files are added with <Badge variant="warning" className="text-xs mx-1">Unverified</Badge> quality</li>
      <li>Existing files are updated if file size or modification date changed</li>
      <li>Missing files (deleted from disk) are flagged but not removed from database</li>
      <li>Match shows to TMDB to enrich with posters, descriptions, and air dates</li>
    </ul>
  );
}
