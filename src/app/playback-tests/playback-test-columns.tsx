'use client';

/**
 * Playback Tests Table Column Definitions
 * Defines columns for TanStack Table with sorting, status badges,
 * and admin actions (edit, delete)
 */

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { BadgeSelector } from '@/components/badge-selector';
import {
  PLAYBACK_STATUS_LABELS,
  PLAYBACK_STATUS_OPTIONS,
  getPlaybackStatusVariant,
} from '@/lib/status';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import type { PlaybackStatus } from '@/generated/prisma/client';
import { Pencil, Trash2 } from 'lucide-react';

export interface PlaybackTestRow {
  id: number;
  episodeFileId: number;
  platformId: number;
  status: PlaybackStatus;
  notes: string | null;
  testedAt: string;
  platform: {
    id: number;
    name: string;
  };
  episodeFile: {
    id: number;
    filename: string;
    quality: string | null;
    episode: {
      id: number;
      episodeNumber: number;
      title: string | null;
      season: {
        seasonNumber: number;
        tvShow: { id: number; title: string };
      };
    };
  };
  // [MOVIES FUTURE] Add movieFile support
}

interface ColumnOptions {
  isAdmin: boolean;
  dateFormat: DateFormat;
  onStatusChange: (testId: number, status: PlaybackStatus) => Promise<void>;
  onEdit: (test: PlaybackTestRow) => void;
  onDelete: (testId: number) => void;
}

/** Build playback test columns dynamically based on user role */
export function getPlaybackTestColumns({
  isAdmin,
  dateFormat,
  onStatusChange,
  onEdit,
  onDelete,
}: ColumnOptions): ColumnDef<PlaybackTestRow>[] {
  const columns: ColumnDef<PlaybackTestRow>[] = [];

  // Show / Episode
  columns.push({
    id: 'showEpisode',
    accessorFn: (row) => {
      const ep = row.episodeFile.episode;
      return `${ep.season.tvShow.title} S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Show / Episode" />
    ),
    cell: ({ row }) => {
      const ep = row.original.episodeFile.episode;
      const label = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
      return (
        <Link
          href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
          className="hover:underline"
        >
          <div className="flex flex-col">
            <span className="font-medium text-sm">{ep.season.tvShow.title}</span>
            <span className="text-xs text-muted-foreground">
              {label}{ep.title ? ` — ${ep.title}` : ''}
            </span>
          </div>
        </Link>
      );
    },
  });

  // File
  columns.push({
    id: 'file',
    accessorFn: (row) => row.episodeFile.filename,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="File" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
        {row.original.episodeFile.filename}
      </span>
    ),
  });

  // Platform
  columns.push({
    id: 'platform',
    accessorFn: (row) => row.platform.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Platform" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.platform.name}</span>
    ),
  });

  // Status — admin gets BadgeSelector
  columns.push({
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const test = row.original;
      if (isAdmin) {
        return (
          <BadgeSelector
            value={test.status}
            options={PLAYBACK_STATUS_OPTIONS}
            displayLabel={PLAYBACK_STATUS_LABELS[test.status]}
            variant={getPlaybackStatusVariant(test.status)}
            getVariant={getPlaybackStatusVariant}
            onValueChange={async (newStatus) => {
              await onStatusChange(test.id, newStatus as PlaybackStatus);
            }}
          />
        );
      }
      return (
        <Badge variant={getPlaybackStatusVariant(test.status)}>
          {PLAYBACK_STATUS_LABELS[test.status]}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const priority: Record<PlaybackStatus, number> = {
        FAIL: 2,
        PARTIAL: 1,
        PASS: 0,
      };
      return priority[rowA.original.status] - priority[rowB.original.status];
    },
  });

  // Notes
  columns.push({
    accessorKey: 'notes',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
        {row.original.notes || '—'}
      </span>
    ),
  });

  // Tested At
  columns.push({
    accessorKey: 'testedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tested At" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDateTimeWithFormat(new Date(row.original.testedAt), dateFormat)}
      </span>
    ),
  });

  // Actions (admin only)
  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const test = row.original;
        return (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(test)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive-foreground"
              onClick={() => onDelete(test.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    });
  }

  return columns;
}
