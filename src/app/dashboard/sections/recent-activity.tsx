/**
 * Recent Activity section — last 5 scan summaries
 * Visible to all users, with admin-only link to scans page
 */

import Link from 'next/link';
import { ScanSearch, ArrowRight, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ScanRecord {
  id: number;
  scanType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  filesScanned: number;
  filesAdded: number;
  filesUpdated: number;
  filesDeleted: number;
}

interface RecentActivityProps {
  recentScans: ScanRecord[];
  isAdmin: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ScanStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="size-4 text-success-foreground" />;
    case 'FAILED':
      return <XCircle className="size-4 text-destructive-foreground" />;
    case 'RUNNING':
      return <Loader2 className="size-4 text-muted-foreground animate-spin" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

function scanStatusVariant(status: string) {
  switch (status) {
    case 'COMPLETED': return 'success' as const;
    case 'FAILED': return 'destructive' as const;
    case 'RUNNING': return 'secondary' as const;
    default: return 'outline' as const;
  }
}

export function RecentActivity({ recentScans, isAdmin }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="size-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest scan history</CardDescription>
        </div>
        {isAdmin && (
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/scans">
              Scan History
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {recentScans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No scans yet. {isAdmin ? 'Run your first scan to populate the library.' : 'Ask your admin to run a scan.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {recentScans.map((scan) => (
              <li key={scan.id} className="flex items-center gap-3 text-sm">
                <ScanStatusIcon status={scan.status} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium capitalize">{scan.scanType} scan</span>
                  {scan.status === 'COMPLETED' && (scan.filesAdded > 0 || scan.filesUpdated > 0 || scan.filesDeleted > 0) && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {scan.filesAdded > 0 && `+${scan.filesAdded} added`}
                      {scan.filesUpdated > 0 && ` ${scan.filesUpdated} updated`}
                      {scan.filesDeleted > 0 && ` -${scan.filesDeleted} removed`}
                    </span>
                  )}
                </div>
                <Badge variant={scanStatusVariant(scan.status)} className="text-xs shrink-0">
                  {scan.status.toLowerCase()}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimeAgo(scan.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
