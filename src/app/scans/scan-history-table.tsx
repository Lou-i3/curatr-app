'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type DateFormat } from '@/lib/settings-shared';
import { getScanHistoryColumns, type ScanHistoryRow } from './scan-history-columns';

interface Props {
  initialScans: ScanHistoryRow[];
  dateFormat: DateFormat;
}

const parseErrors = (errors: string | null): Array<{ filepath: string; error: string }> => {
  if (!errors) return [];
  try {
    return JSON.parse(errors);
  } catch {
    return [];
  }
};

export function ScanHistoryTable({ initialScans, dateFormat }: Props) {
  const [errorDialogScanId, setErrorDialogScanId] = useState<number | null>(null);

  const columns = useMemo(
    () =>
      getScanHistoryColumns({
        dateFormat,
        onErrorsClick: (scanId) => setErrorDialogScanId(scanId),
      }),
    [dateFormat]
  );

  if (initialScans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No scans yet. Start a scan to populate your library.
        </CardContent>
      </Card>
    );
  }

  const errorScan = errorDialogScanId
    ? initialScans.find((s) => s.id === errorDialogScanId)
    : null;
  const errors = errorScan ? parseErrors(errorScan.errors) : [];

  return (
    <>
      <Card className="p-0">
        <CardContent className="p-2">
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={initialScans} />
          </div>
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={!!errorDialogScanId} onOpenChange={(open) => !open && setErrorDialogScanId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Errors ({errors.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {errors.map((err, idx) => (
              <div key={idx} className="border-l-2 border-destructive pl-3 py-1">
                <p className="text-sm font-medium text-destructive">{err.error}</p>
                {err.filepath && (
                  <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                    {err.filepath}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
