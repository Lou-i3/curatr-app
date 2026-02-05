/**
 * Scans page - View scan history and trigger new scans
 */

import { prisma } from '@/lib/prisma';
import { ScanControls } from './scan-controls';
import { ScanHistoryTable } from './scan-history-table';

export const revalidate = 0;

export default async function ScansPage() {
  const scans = await prisma.scanHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Library Scans</h1>
          <p className="text-muted-foreground mt-2">
            Scan your media library to discover and track TV shows
          </p>
        </header>

        <section className="mb-8">
          <ScanControls />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Scan History</h2>
          <ScanHistoryTable initialScans={scans} />
        </section>
      </div>
    </div>
  );
}
