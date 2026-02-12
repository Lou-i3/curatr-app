'use client';

/**
 * Dashboard Client — orchestrates all client-side dashboard sections
 * Handles role-gating via useAuth() and wires up contexts
 */

import { useAuth } from '@/lib/contexts/auth-context';
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

export interface DashboardClientProps {
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
}

export function DashboardClient({
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
}: DashboardClientProps) {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Quick Actions — role-aware */}
      <QuickActions />

      {/* Issues Overview — everyone */}
      <IssuesOverview />

      {/* Recent Activity — everyone */}
      <RecentActivity recentScans={recentScans} isAdmin={isAdmin} />

      {/* Quality Overview — everyone */}
      <QualityBreakdown qualityData={qualityData} totalFiles={totalFiles} />

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
