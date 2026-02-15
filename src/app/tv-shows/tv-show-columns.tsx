'use client';

/**
 * TV Shows Table Column Definitions
 * Defines columns for TanStack Table with sorting, custom cell renderers,
 * and interactive components (BadgeSelector, dialogs, links)
 */

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { ShowStatusBadges } from './show-status-badges';
import { TVShowDialog } from './show-dialog';
import {
  getQualityStatusVariant,
  QUALITY_STATUS_LABELS,
  type QualityStatus,
  type DisplayMonitorStatus,
} from '@/lib/status';
import type { MonitorStatus } from '@/generated/prisma/client';
import { formatFileSize, formatDuration } from '@/lib/settings-shared';

export interface TVShow {
  id: number;
  title: string;
  year: number | null;
  description: string | null;
  notes: string | null;
  posterPath: string | null;
  tmdbId: number | null;
  voteAverage: number | null;
  monitorStatus: MonitorStatus;
  displayMonitorStatus: DisplayMonitorStatus;
  qualityStatus: QualityStatus;
  seasonCount: number;
  episodeCount: number;
  fileCount: number;
  totalSize: string;
  missingFileCount: number;
  missingFileSize: string;
  totalRuntime: number;
}

export const tvShowColumns: ColumnDef<TVShow>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const show = row.original;
      return (
        <Link href={`/tv-shows/${show.id}`} className="hover:underline">
          <div className="flex items-center gap-2">
            <span className="font-medium">{show.title}</span>
            {show.tmdbId && (
              <Badge variant="outline" className="text-xs">TMDB</Badge>
            )}
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: 'year',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Year" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.year ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'voteAverage',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rating" />
    ),
    cell: ({ row }) => {
      const rating = row.original.voteAverage;
      return rating ? (
        <span className="flex items-center gap-1 text-warning-foreground">
          <Star className="size-3 fill-current" />
          {rating.toFixed(1)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    sortingFn: 'basic',
  },
  {
    accessorKey: 'seasonCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Seasons" />
    ),
  },
  {
    accessorKey: 'episodeCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Episodes" />
    ),
  },
  {
    accessorKey: 'fileCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Files" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.fileCount}</span>
    ),
  },
  {
    accessorKey: 'totalSize',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Size" />
    ),
    cell: ({ row }) => {
      const show = row.original;
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {show.fileCount > 0 ? formatFileSize(BigInt(show.totalSize)) : '—'}
        </span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = BigInt(rowA.original.totalSize);
      const b = BigInt(rowB.original.totalSize);
      return a > b ? 1 : a < b ? -1 : 0;
    },
  },
  {
    accessorKey: 'monitorStatus',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monitor" />
    ),
    cell: ({ row }) => {
      const show = row.original;
      return (
        <ShowStatusBadges
          showId={show.id}
          monitorStatus={show.monitorStatus}
          displayMonitorStatus={show.displayMonitorStatus}
          qualityStatus={show.qualityStatus}
          hasChildren={show.seasonCount > 0}
          showQuality={false}
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
      const show = row.original;
      return show.monitorStatus !== 'UNWANTED' ? (
        <Badge variant={getQualityStatusVariant(show.qualityStatus)}>
          {QUALITY_STATUS_LABELS[show.qualityStatus]}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    sortingFn: (rowA, rowB) => {
      // Priority: BROKEN > MISSING > UNVERIFIED > OK
      const priority: Record<QualityStatus, number> = {
        OK: 0,
        UNVERIFIED: 1,
        MISSING: 2,
        BROKEN: 3,
      };
      return priority[rowA.original.qualityStatus] - priority[rowB.original.qualityStatus];
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const show = row.original;
      return (
        <div className="flex justify-end gap-1">
          <TVShowDialog show={show} />
        </div>
      );
    },
    enableSorting: false,
  },
];
