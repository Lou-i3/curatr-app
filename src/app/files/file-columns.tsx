'use client';

/**
 * Files Table Column Definitions
 * Defines columns for TanStack Table with sorting, quality/action badges,
 * and admin actions (inline editing, analyze, rescan)
 */

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { BadgeSelector } from '@/components/badge-selector';
import {
  FILE_QUALITY_LABELS,
  FILE_QUALITY_OPTIONS,
  ACTION_LABELS,
  ACTION_OPTIONS,
  getFileQualityVariant,
  getActionVariant,
} from '@/lib/status';
import { formatDateTimeWithFormat, formatFileSize, type DateFormat } from '@/lib/settings-shared';
import type { FileQuality, Action } from '@/generated/prisma/client';
import {
  Check,
  X,
  RefreshCw,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FileRow {
  id: number;
  episodeId: number;
  filepath: string;
  filename: string;
  fileSize: string;
  dateModified: string;
  fileExists: boolean;
  quality: FileQuality;
  action: Action;
  notes: string | null;
  codec: string | null;
  resolution: string | null;
  bitrate: number | null;
  container: string | null;
  audioFormat: string | null;
  hdrType: string | null;
  duration: number | null;
  mediaInfoExtractedAt: string | null;
  mediaInfoError: string | null;
  plexMatched: boolean;
  testCount: number;
  issueCount: number;
  episode: {
    id: number;
    episodeNumber: number;
    title: string | null;
    season: {
      seasonNumber: number;
      tvShow: { id: number; title: string };
    };
  };
  // [MOVIES FUTURE] Add movieFile support
}

interface ColumnOptions {
  isAdmin: boolean;
  dateFormat: DateFormat;
  onQualityChange: (fileId: number, quality: FileQuality) => Promise<void>;
  onActionChange: (fileId: number, action: Action) => Promise<void>;
  onAnalyze: (fileId: number) => void;
  onRescan: (fileId: number) => void;
  analyzingId: number | null;
  rescanningId: number | null;
}

/** Build file columns dynamically based on user role */
export function getFileColumns({
  isAdmin,
  dateFormat,
  onQualityChange,
  onActionChange,
  onAnalyze,
  onRescan,
  analyzingId,
  rescanningId,
}: ColumnOptions): ColumnDef<FileRow>[] {
  const columns: ColumnDef<FileRow>[] = [];

  // Filename
  columns.push({
    accessorKey: 'filename',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Filename" />
    ),
    cell: ({ row }) => {
      const file = row.original;
      const ep = file.episode;
      return (
        <Link
          href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
          className="hover:underline"
        >
          <span className="text-sm font-medium truncate block max-w-[300px]">
            {file.filename}
          </span>
        </Link>
      );
    },
  });

  // Show / Episode
  columns.push({
    id: 'showEpisode',
    accessorFn: (row) =>
      `${row.episode.season.tvShow.title} S${String(row.episode.season.seasonNumber).padStart(2, '0')}E${String(row.episode.episodeNumber).padStart(2, '0')}`,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Show / Episode" />
    ),
    cell: ({ row }) => {
      const ep = row.original.episode;
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

  // Size
  columns.push({
    id: 'fileSize',
    accessorFn: (row) => Number(row.fileSize),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Size" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatFileSize(BigInt(row.original.fileSize))}
      </span>
    ),
    sortingFn: (rowA, rowB) =>
      Number(BigInt(rowA.original.fileSize) - BigInt(rowB.original.fileSize)),
  });

  // Quality — admin gets BadgeSelector
  columns.push({
    accessorKey: 'quality',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quality" />
    ),
    cell: ({ row }) => {
      const file = row.original;
      if (isAdmin) {
        return (
          <BadgeSelector
            value={file.quality}
            options={FILE_QUALITY_OPTIONS}
            displayLabel={FILE_QUALITY_LABELS[file.quality]}
            variant={getFileQualityVariant(file.quality)}
            getVariant={getFileQualityVariant}
            onValueChange={async (newQuality) => {
              await onQualityChange(file.id, newQuality as FileQuality);
            }}
          />
        );
      }
      return (
        <Badge variant={getFileQualityVariant(file.quality)}>
          {FILE_QUALITY_LABELS[file.quality]}
        </Badge>
      );
    },
  });

  // Action — admin gets BadgeSelector
  columns.push({
    accessorKey: 'action',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const file = row.original;
      if (isAdmin) {
        return (
          <BadgeSelector
            value={file.action}
            options={ACTION_OPTIONS}
            displayLabel={ACTION_LABELS[file.action]}
            variant={getActionVariant(file.action)}
            getVariant={getActionVariant}
            onValueChange={async (newAction) => {
              await onActionChange(file.id, newAction as Action);
            }}
          />
        );
      }
      return (
        <Badge variant={getActionVariant(file.action)}>
          {ACTION_LABELS[file.action]}
        </Badge>
      );
    },
  });

  // Codec
  columns.push({
    accessorKey: 'codec',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codec" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.codec || '—'}
      </span>
    ),
  });

  // Resolution
  columns.push({
    accessorKey: 'resolution',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Resolution" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.resolution || '—'}
      </span>
    ),
  });

  // HDR
  columns.push({
    id: 'hdrType',
    accessorFn: (row) => row.hdrType ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="HDR" />
    ),
    cell: ({ row }) =>
      row.original.hdrType ? (
        <Badge variant="secondary">{row.original.hdrType}</Badge>
      ) : row.original.mediaInfoExtractedAt ? (
        <span className="text-sm text-muted-foreground">SDR</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  });

  // Container — hidden by default
  columns.push({
    accessorKey: 'container',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Container" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.container || '—'}
      </span>
    ),
    enableHiding: true,
  });

  // Analyzed
  columns.push({
    id: 'analyzed',
    accessorFn: (row) => row.mediaInfoExtractedAt ?? '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Analyzed" />
    ),
    cell: ({ row }) => {
      const file = row.original;
      if (file.mediaInfoError) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-xs">{file.mediaInfoError}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      if (file.mediaInfoExtractedAt) {
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTimeWithFormat(new Date(file.mediaInfoExtractedAt), dateFormat)}
          </span>
        );
      }
      return <span className="text-sm text-muted-foreground">—</span>;
    },
  });

  // Modified
  columns.push({
    accessorKey: 'dateModified',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modified" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTimeWithFormat(new Date(row.original.dateModified), dateFormat)}
      </span>
    ),
  });

  // Issues count
  columns.push({
    accessorKey: 'issueCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Issues" />
    ),
    cell: ({ row }) => {
      const count = row.original.issueCount;
      return count > 0 ? (
        <Badge variant="destructive">{count}</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">0</span>
      );
    },
  });

  // Tests count
  columns.push({
    accessorKey: 'testCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tests" />
    ),
    cell: ({ row }) => {
      const count = row.original.testCount;
      return count > 0 ? (
        <Badge variant="secondary">{count}</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">0</span>
      );
    },
  });

  // On Disk
  columns.push({
    id: 'fileExists',
    accessorFn: (row) => (row.fileExists ? 'yes' : 'no'),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="On Disk" />
    ),
    cell: ({ row }) =>
      row.original.fileExists ? (
        <Check className="h-4 w-4 text-success-foreground" />
      ) : (
        <X className="h-4 w-4 text-destructive-foreground" />
      ),
  });

  // Actions (admin only)
  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const file = row.original;
        const ep = file.episode;
        return (
          <div className="flex justify-end gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => onAnalyze(file.id)}
                    disabled={!file.fileExists || analyzingId === file.id}
                  >
                    {analyzingId === file.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
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
                    onClick={() => onRescan(file.id)}
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
        );
      },
      enableSorting: false,
    });
  }

  return columns;
}
