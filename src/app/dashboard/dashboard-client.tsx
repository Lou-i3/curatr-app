'use client';

/**
 * Dashboard Client — orchestrates all client-side dashboard sections
 * Handles role-gating via useAuth() and wires up contexts
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/contexts/auth-context';
import { LibraryHealth } from './sections/library-health';
import { QuickActions } from './sections/quick-actions';
import { IssuesOverview } from './sections/issues-overview';
import { RecentActivity } from './sections/recent-activity';
import { QualityBreakdown } from './sections/quality-breakdown';
import { ActionsNeeded } from './sections/actions-needed';
import { FileIntelligence } from './sections/file-intelligence';
import { SystemOperations } from './sections/system-operations';
import { IntegrationHealth } from './sections/integration-health';

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

interface QualityGroup {
  quality: string;
  count: number;
}

interface ActionGroup {
  action: string;
  count: number;
}

interface GroupData {
  name: string;
  count: number;
}

interface LibraryHealthData {
  showCount: number;
  episodeCount: number;
  fileCount: number;
  totalSizeFormatted: string;
  healthPercent: number;
  healthLabel: string;
}

export interface DashboardClientProps {
  username: string | null;
  libraryHealth: LibraryHealthData;
  recentScans: ScanRecord[];
  qualityData: QualityGroup[];
  actionData: ActionGroup[];
  codecs: GroupData[];
  resolutions: GroupData[];
  hdr: GroupData[];
  totalFiles: number;
  tmdbMatchedCount: number;
  totalShows: number;
  analyzedFiles: number;
  ffprobeAvailable: boolean;
}

export function DashboardClient({
  username,
  libraryHealth,
  recentScans,
  qualityData,
  actionData,
  codecs,
  resolutions,
  hdr,
  totalFiles,
  tmdbMatchedCount,
  totalShows,
  analyzedFiles,
  ffprobeAvailable,
}: DashboardClientProps) {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const greeting = username ? `Hi, ${username}` : 'Dashboard';

  return (
    <>
      {/* Greeting header with refresh */}
      <PageHeader
        title={greeting}
        description="Overview of your media library"
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Library Health Stats */}
      <LibraryHealth
        showCount={libraryHealth.showCount}
        episodeCount={libraryHealth.episodeCount}
        fileCount={libraryHealth.fileCount}
        totalSizeFormatted={libraryHealth.totalSizeFormatted}
        healthPercent={libraryHealth.healthPercent}
        healthLabel={libraryHealth.healthLabel}
      />

      {/* Quick Actions — role-aware */}
      <QuickActions />

      {/* Issues + Recent Activity — side by side on desktop */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 mb-6 md:mb-8">
        <IssuesOverview />
        <RecentActivity recentScans={recentScans} isAdmin={isAdmin} />
      </div>

      {/* Quality Overview — everyone, constrained width */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 mb-6 md:mb-8">
        <QualityBreakdown qualityData={qualityData} totalFiles={totalFiles} />
      </div>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Actions Needed + System Operations side by side */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 mb-6 md:mb-8">
            <ActionsNeeded actionData={actionData} />
            <SystemOperations />
          </div>

          {/* File Intelligence — codec/resolution/HDR */}
          <FileIntelligence
            codecs={codecs}
            resolutions={resolutions}
            hdr={hdr}
            analyzedCount={analyzedFiles}
            totalFiles={totalFiles}
            ffprobeAvailable={ffprobeAvailable}
          />

          {/* Integration Health — TMDB + FFprobe */}
          <IntegrationHealth
            tmdbMatchedCount={tmdbMatchedCount}
            totalShows={totalShows}
            analyzedFiles={analyzedFiles}
            totalFiles={totalFiles}
          />
        </>
      )}
    </>
  );
}
