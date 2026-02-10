'use client';

/**
 * Episode Table Column Definitions
 * Defines columns for episode DataTable with interactive components
 */

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, PlayCircle, AlertTriangle } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { BadgeSelector } from '@/components/badge-selector';
import { EpisodeDialog } from './episode-dialog';
import { PlaybackTestDialog } from '@/components/playback-test-dialog';
import { IssueReportDialog } from '@/components/issues/issue-report-dialog';
import {
  getMonitorStatusVariant,
  getQualityStatusVariant,
  MONITOR_STATUS_LABELS,
  MONITOR_STATUS_OPTIONS,
  QUALITY_STATUS_LABELS,
  type QualityStatus,
} from '@/lib/status';
import type { MonitorStatus } from '@/generated/prisma/client';

export interface Episode {
  id: number;
  episodeNumber: number;
  tmdbEpisodeId: number | null;
  title: string | null;
  monitorStatus: MonitorStatus;
  qualityStatus: QualityStatus;
  notes: string | null;
  description: string | null;
  airDate: Date | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number | null;
  files: { id: number }[];
}

export function createEpisodeColumns(
  showId: number,
  showTitle: string,
  showTmdbId: number | null,
  seasonNumber: number,
  onUpdate: () => void
): ColumnDef<Episode>[] {
  return [
    {
      accessorKey: 'episodeNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Episode" />
      ),
      cell: ({ row }) => (
        <span className="font-medium font-mono">
          E{String(row.original.episodeNumber).padStart(2, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'tmdbEpisodeId',
      header: 'TMDB',
      cell: ({ row }) => {
        const episode = row.original;
        return episode.tmdbEpisodeId && showTmdbId ? (
          <a
            href={`https://www.themoviedb.org/tv/${showTmdbId}/season/${seasonNumber}/episode/${episode.episodeNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground text-xs font-mono hover:text-primary hover:underline"
          >
            #{episode.tmdbEpisodeId}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => row.original.title || '—',
    },
    {
      accessorKey: 'monitorStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Monitor" />
      ),
      cell: ({ row }) => {
        const episode = row.original;
        return (
          <BadgeSelector
            value={episode.monitorStatus}
            displayLabel={MONITOR_STATUS_LABELS[episode.monitorStatus]}
            variant={getMonitorStatusVariant(episode.monitorStatus)}
            getVariant={getMonitorStatusVariant}
            options={MONITOR_STATUS_OPTIONS}
            onValueChange={() => {}} // Handled by cascade API call
            cascadeOptions={{
              entityType: 'episode',
              entityId: episode.id,
              hasChildren: false,
              apiEndpoint: '/api/episodes',
              propertyKey: 'monitorStatus',
              entityLabel: 'episode',
              childrenLabel: '',
              getConfirmationText: (value: string) =>
                value === 'WANTED' ? 'Change to Wanted' : 'Change to Unwanted',
            }}
            onUpdate={onUpdate}
            className="text-xs"
          />
        );
      },
    },
    {
      accessorKey: 'qualityStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quality" />
      ),
      cell: ({ row }) => {
        const episode = row.original;
        return episode.monitorStatus !== 'UNWANTED' ? (
          <Badge variant={getQualityStatusVariant(episode.qualityStatus)} className="text-xs">
            {QUALITY_STATUS_LABELS[episode.qualityStatus]}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      accessorKey: 'files',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Files" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.files.length}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        return rowA.original.files.length - rowB.original.files.length;
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const episode = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <IssueReportDialog
              episodeId={episode.id}
              episodeLabel={`${showTitle} — S${String(seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Report issue">
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              }
            />
            {episode.files.length > 0 && (
              <PlaybackTestDialog
                episodeId={episode.id}
                episodeTitle={episode.title}
                seasonEpisode={`S${String(seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                }
              />
            )}
            <EpisodeDialog
              episode={episode}
              seasonNumber={seasonNumber}
            />
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/tv-shows/${showId}/episodes/${episode.id}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
