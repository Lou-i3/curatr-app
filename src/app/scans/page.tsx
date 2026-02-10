/**
 * Scans page - View scan history and trigger new scans
 */

import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getConfig } from '@/lib/scanner/config';
import { ScanControls } from './scan-controls';
import { ScanHistoryTable } from './scan-history-table';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  const [scans, settings] = await Promise.all([
    prisma.scanHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    getSettings(),
  ]);

  // Get configured paths (safely)
  let tvShowsPath = '';
  let moviesPath = '';
  try {
    const config = getConfig();
    tvShowsPath = config.tvShowsPath;
    moviesPath = config.moviesPath;
  } catch {
    // Config not set
  }

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Library Scans"
        description="Scan your media library to discover and track TV shows"
      />

      {/* Scan Controls */}
      <div className="mb-6 md:mb-8">
        <ScanControls tvShowsPath={tvShowsPath} moviesPath={moviesPath} />
      </div>

      {/* Scan History */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Scan History</h2>
        <ScanHistoryTable initialScans={scans} dateFormat={settings.dateFormat} />
      </div>
    </PageContainer>
  );
}
