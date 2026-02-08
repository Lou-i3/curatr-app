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
  getIssueTypeVariant,
  getIssueStatusVariant,
} from '@/lib/issue-utils';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';
import { Pencil, Trash2, User } from 'lucide-react';
import { IssueEditDialog } from '@/components/issues/issue-edit-dialog';

export interface IssueRow {
  id: number;
  type: IssueType;
  status: IssueStatus;
  description: string | null;
  platform: string | null;
  audioLang: string | null;
  subtitleLang: string | null;
  resolution: string | null;
  createdAt: string;
  user: { id: number; username: string; thumbUrl: string | null; role: string } | null;
  episode: {
    id: number;
    episodeNumber: number;
    title: string | null;
    season: {
      seasonNumber: number;
      tvShow: { id: number; title: string };
    };
  };
  resolvedBy: { id: number; username: string } | null;
}

interface ColumnOptions {
  isAdmin: boolean;
  authMode: 'none' | 'plex';
  currentUserId: number | null;
  dateFormat: DateFormat;
  onStatusChange: (issueId: number, status: IssueStatus) => Promise<void>;
  onIssueUpdated: (issueId: number, updated: { status: IssueStatus; resolution: string | null }) => void;
  onDelete: (issueId: number) => void;
}

/** Build issue columns dynamically based on user role and auth mode */
export function getIssueColumns({
  isAdmin,
  authMode,
  currentUserId,
  dateFormat,
  onStatusChange,
  onIssueUpdated,
  onDelete,
}: ColumnOptions): ColumnDef<IssueRow>[] {
  const columns: ColumnDef<IssueRow>[] = [];

  // Type
  columns.push({
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant={getIssueTypeVariant(row.original.type)}>
        {ISSUE_TYPE_LABELS[row.original.type]}
      </Badge>
    ),
  });

  // Episode (show + season/episode)
  columns.push({
    id: 'episode',
    accessorFn: (row) =>
      `${row.episode.season.tvShow.title} S${String(row.episode.season.seasonNumber).padStart(2, '0')}E${String(row.episode.episodeNumber).padStart(2, '0')}`,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Episode" />
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
            onValueChange={async (newStatus) => {
              await onStatusChange(issue.id, newStatus as IssueStatus);
            }}
          />
        );
      }
      return (
        <Badge variant={getIssueStatusVariant(issue.status)}>
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
      const canEdit = isAdmin || isOwner;

      if (!canEdit && !canDelete) return null;

      const ep = issue.episode;
      const episodeLabel = `${ep.season.tvShow.title} — S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;

      return (
        <div className="flex justify-end gap-0.5">
          {canEdit && (
            <IssueEditDialog
              issue={issue}
              episodeLabel={episodeLabel}
              isAdmin={isAdmin}
              isOwner={isOwner}
              onUpdated={(updated) => onIssueUpdated(issue.id, updated)}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
          )}
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
