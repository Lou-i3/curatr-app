'use client';

/**
 * Issues Table Column Definitions
 * Defines columns for TanStack Table with sorting, status badges,
 * and admin actions (inline status change, delete)
 */

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { BadgeSelector } from '@/components/badge-selector';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  ISSUE_TYPE_ICONS,
  ISSUE_STATUS_ICONS,
  ISSUE_SUB_TYPE_LABELS,
  getIssueTypeVariant,
  getIssueStatusVariant,
  type IssueSubType,
} from '@/lib/issue-utils';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';
import { ExternalLink, Trash2, User } from 'lucide-react';

interface IssueEpisode {
  id: number;
  episodeNumber: number;
  title: string | null;
  season: {
    seasonNumber: number;
    tvShow: { id: number; title: string };
  };
}

export interface IssueRow {
  id: number;
  type: IssueType;
  status: IssueStatus;
  description: string | null;
  platform: string | null;
  audioLang: string | null;
  subtitleLang: string | null;
  subType: string | null;
  createdAt: string;
  user: { id: number; username: string; thumbUrl: string | null; role: string } | null;
  episodes: Array<{ episodeId: number; episode: IssueEpisode }>;
  _count?: { comments: number };
}

interface ColumnOptions {
  isAdmin: boolean;
  authMode: 'none' | 'plex';
  currentUserId: number | null;
  dateFormat: DateFormat;
  onStatusChange: (issueId: number, status: IssueStatus) => Promise<void>;
  onDelete: (issueId: number) => void;
}

/** Get the primary (first) episode from an issue's episodes array */
function getPrimaryEpisode(episodes: IssueRow['episodes']): IssueEpisode | null {
  if (episodes.length === 0) return null;
  // Sort by season number then episode number to get the primary
  const sorted = [...episodes].sort((a, b) => {
    const sDiff = a.episode.season.seasonNumber - b.episode.season.seasonNumber;
    if (sDiff !== 0) return sDiff;
    return a.episode.episodeNumber - b.episode.episodeNumber;
  });
  return sorted[0].episode;
}

/** Build issue columns dynamically based on user role and auth mode */
export function getIssueColumns({
  isAdmin,
  authMode,
  currentUserId,
  dateFormat,
  onStatusChange,
  onDelete,
}: ColumnOptions): ColumnDef<IssueRow>[] {
  const columns: ColumnDef<IssueRow>[] = [];

  // Type
  columns.push({
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const TypeIcon = ISSUE_TYPE_ICONS[row.original.type];
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant={getIssueTypeVariant(row.original.type)}>
            <TypeIcon className="size-3 mr-1" />
            {ISSUE_TYPE_LABELS[row.original.type]}
          </Badge>
          {row.original.subType && (
            <span className="text-xs text-muted-foreground">
              {ISSUE_SUB_TYPE_LABELS[row.original.subType as IssueSubType]}
            </span>
          )}
        </div>
      );
    },
  });

  // Episode (show + season/episode)
  columns.push({
    id: 'episode',
    accessorFn: (row) => {
      const ep = getPrimaryEpisode(row.episodes);
      if (!ep) return '';
      return `${ep.season.tvShow.title} S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Episode" />
    ),
    cell: ({ row }) => {
      const ep = getPrimaryEpisode(row.original.episodes);
      if (!ep) return <span className="text-muted-foreground">No episodes</span>;
      const label = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
      const extraCount = row.original.episodes.length - 1;
      return (
        <Link
          href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
          className="hover:underline"
        >
          <div className="flex flex-col">
            <span className="font-medium text-sm">{ep.season.tvShow.title}</span>
            <span className="text-xs text-muted-foreground">
              {label}{ep.title ? ` — ${ep.title}` : ''}
              {extraCount > 0 && (
                <span className="ml-1 text-muted-foreground">+{extraCount} more</span>
              )}
            </span>
          </div>
        </Link>
      );
    },
  });

  // Reporter — only in plex auth mode
  if (authMode === 'plex') {
    columns.push({
      id: 'reporter',
      accessorFn: (row) => row.user?.username ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reporter" />
      ),
      cell: ({ row }) => {
        const issue = row.original;
        if (!issue.user) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-1.5">
            {issue.user.thumbUrl ? (
              <img src={issue.user.thumbUrl} alt="" className="size-4 rounded-full" />
            ) : (
              <User className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-sm">{issue.user.username}</span>
          </span>
        );
      },
    });
  }

  // Status — admin gets inline BadgeSelector, others get plain badge
  columns.push({
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const issue = row.original;
      if (isAdmin) {
        const StatusIcon = ISSUE_STATUS_ICONS[issue.status];
        return (
          <BadgeSelector
            value={issue.status}
            options={ISSUE_STATUSES.map((s) => ({
              value: s,
              label: ISSUE_STATUS_LABELS[s],
            }))}
            displayLabel={ISSUE_STATUS_LABELS[issue.status]}
            variant={getIssueStatusVariant(issue.status)}
            getVariant={getIssueStatusVariant}
            getIcon={(s) => {
              const Icon = ISSUE_STATUS_ICONS[s as IssueStatus];
              return <Icon className="size-3 mr-1" />;
            }}
            onValueChange={async (newStatus) => {
              await onStatusChange(issue.id, newStatus as IssueStatus);
            }}
            icon={<StatusIcon className="size-3 mr-1" />}
          />
        );
      }
      const StatusIcon = ISSUE_STATUS_ICONS[issue.status];
      return (
        <Badge variant={getIssueStatusVariant(issue.status)}>
          <StatusIcon className="size-3 mr-1" />
          {ISSUE_STATUS_LABELS[issue.status]}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const priority: Record<IssueStatus, number> = {
        OPEN: 4,
        ACKNOWLEDGED: 3,
        IN_PROGRESS: 2,
        RESOLVED: 1,
        CLOSED: 0,
      };
      return priority[rowA.original.status] - priority[rowB.original.status];
    },
  });

  // Platform
  columns.push({
    accessorKey: 'platform',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Platform" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.platform || '—'}
      </span>
    ),
  });

  // Date
  columns.push({
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDateTimeWithFormat(new Date(row.original.createdAt), dateFormat)}
      </span>
    ),
  });

  // Actions
  columns.push({
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const issue = row.original;
      const isOwner = currentUserId !== null && issue.user?.id === currentUserId;
      const canDelete = isAdmin || (isOwner && issue.status === 'OPEN');

      return (
        <div className="flex justify-end gap-0.5">
          <Link href={`/issues/${issue.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              title="View details"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive-foreground"
              onClick={() => onDelete(issue.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      );
    },
    enableSorting: false,
  });

  return columns;
}
