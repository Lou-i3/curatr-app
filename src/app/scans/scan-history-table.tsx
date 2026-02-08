'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';

interface ScanHistory {
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

interface Props {
  initialScans: ScanHistory[];
  dateFormat: DateFormat;
}

export function ScanHistoryTable({ initialScans, dateFormat }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return formatDateTimeWithFormat(d, dateFormat);
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'RUNNING':
        return <Badge variant="secondary">Running</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const parseErrors = (errors: string | null): Array<{ filepath: string; error: string }> => {
    if (!errors) return [];
    try {
      return JSON.parse(errors);
    } catch {
      return [];
    }
  };

  if (initialScans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No scans yet. Start a scan to populate your library.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Started</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Scanned</TableHead>
            <TableHead className="text-right">Added</TableHead>
            <TableHead className="text-right">Updated</TableHead>
            <TableHead className="text-right">Deleted</TableHead>
            <TableHead className="text-right">Errors</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialScans.map((scan) => {
            const errors = parseErrors(scan.errors);
            const isExpanded = expandedId === scan.id;

            return [
              <TableRow
                key={scan.id}
                className={errors.length > 0 ? 'cursor-pointer' : ''}
                onClick={() => {
                  if (errors.length > 0) {
                    setExpandedId(isExpanded ? null : scan.id);
                  }
                }}
              >
                <TableCell className="font-mono text-sm">
                  {formatDate(scan.startedAt)}
                </TableCell>
                <TableCell className="capitalize">{scan.scanType}</TableCell>
                <TableCell>{getStatusBadge(scan.status)}</TableCell>
                <TableCell>
                  {formatDuration(scan.startedAt, scan.completedAt)}
                </TableCell>
                <TableCell className="text-right">{scan.filesScanned}</TableCell>
                <TableCell className="text-right text-success-foreground">
                  {scan.filesAdded > 0 ? `+${scan.filesAdded}` : '-'}
                </TableCell>
                <TableCell className="text-right text-secondary">
                  {scan.filesUpdated > 0 ? scan.filesUpdated : '-'}
                </TableCell>
                <TableCell className="text-right text-warning-foreground">
                  {scan.filesDeleted > 0 ? scan.filesDeleted : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {errors.length > 0 ? (
                    <Badge variant="destructive" className="cursor-pointer">
                      {errors.length}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>,
              isExpanded && errors.length > 0 && (
                <TableRow key={`${scan.id}-errors`}>
                  <TableCell colSpan={9} className="bg-muted/50">
                    <div className="py-2 space-y-1">
                      <p className="text-sm font-medium mb-2">Errors ({errors.length}):</p>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {errors.map((err, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            <span className="text-destructive">{err.error}</span>
                            {err.filepath && (
                              <span className="ml-2 truncate block">{err.filepath}</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            ];
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
