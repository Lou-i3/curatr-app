'use client';

/**
 * Scan History Table Column Definitions
 * Defines columns for TanStack Table with sorting and status badges
 */

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';

export interface ScanHistoryRow {
  id: number;
  scanType: string;
  startedAt: Date | string;
  completedAt: Date | string | null;
  filesScanned: number;
  filesAdded: number;
  filesUpdated: number;
  filesDeleted: number;
  errors: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
}

interface ColumnOptions {
  dateFormat: DateFormat;
  onErrorsClick: (scanId: number) => void;
}

const formatDuration = (start: Date | string, end: Date | string | null) => {
  if (!end) return 'In progress';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const seconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const parseErrors = (errors: string | null): Array<{ filepath: string; error: string }> => {
  if (!errors) return [];
  try {
    return JSON.parse(errors);
  } catch {
    return [];
  }
};

/** Build scan history columns */
export function getScanHistoryColumns({
  dateFormat,
  onErrorsClick,
}: ColumnOptions): ColumnDef<ScanHistoryRow>[] {
  return [
    // Started At
    {
      accessorKey: 'startedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Started" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm whitespace-nowrap">
          {formatDateTimeWithFormat(new Date(row.original.startedAt), dateFormat)}
        </span>
      ),
    },

    // Type
    {
      accessorKey: 'scanType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <span className="capitalize text-sm">{row.original.scanType}</span>
      ),
    },

    // Status
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: 'success' | 'secondary' | 'destructive' = 'secondary';
        if (status === 'COMPLETED') variant = 'success';
        if (status === 'FAILED') variant = 'destructive';

        return (
          <Badge variant={variant}>
            {status === 'COMPLETED' ? 'Completed' : status === 'RUNNING' ? 'Running' : 'Failed'}
          </Badge>
        );
      },
      sortingFn: (rowA, rowB) => {
        const priority: Record<string, number> = {
          RUNNING: 2,
          FAILED: 1,
          COMPLETED: 0,
        };
        return priority[rowA.original.status] - priority[rowB.original.status];
      },
    },

    // Duration
    {
      id: 'duration',
      accessorFn: (row) => {
        if (!row.completedAt) return Number.MAX_SAFE_INTEGER; // Running scans sort last
        const startDate = new Date(row.startedAt);
        const endDate = new Date(row.completedAt);
        return (endDate.getTime() - startDate.getTime()) / 1000;
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDuration(row.original.startedAt, row.original.completedAt)}
        </span>
      ),
    },

    // Files Scanned
    {
      accessorKey: 'filesScanned',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scanned" className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm">{row.original.filesScanned}</div>
      ),
    },

    // Files Added
    {
      accessorKey: 'filesAdded',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Added" className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm text-success-foreground">
          {row.original.filesAdded > 0 ? `+${row.original.filesAdded}` : '-'}
        </div>
      ),
    },

    // Files Updated
    {
      accessorKey: 'filesUpdated',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated" className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm">
          {row.original.filesUpdated > 0 ? row.original.filesUpdated : '-'}
        </div>
      ),
    },

    // Files Deleted
    {
      accessorKey: 'filesDeleted',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deleted" className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm text-warning-foreground">
          {row.original.filesDeleted > 0 ? row.original.filesDeleted : '-'}
        </div>
      ),
    },

    // Errors
    {
      id: 'errors',
      accessorFn: (row) => parseErrors(row.errors).length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Errors" className="justify-end" />
      ),
      cell: ({ row }) => {
        const errors = parseErrors(row.original.errors);
        if (errors.length === 0) {
          return <div className="text-right text-sm">-</div>;
        }
        return (
          <div className="flex justify-end">
            <Badge
              variant="destructive"
              className="cursor-pointer"
              onClick={() => onErrorsClick(row.original.id)}
            >
              {errors.length}
            </Badge>
          </div>
        );
      },
    },
  ];
}
