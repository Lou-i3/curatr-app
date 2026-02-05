/**
 * GET /api/scan/[id] - Get scan status/details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScanHistory, getScanProgress, isScanActive } from '@/lib/scanner';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const scanId = parseInt(id, 10);

  if (isNaN(scanId)) {
    return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
  }

  // Check if scan is currently running
  const isRunning = isScanActive(scanId);

  if (isRunning) {
    const tracker = getScanProgress(scanId);
    if (tracker) {
      return NextResponse.json({
        ...tracker.getProgress(),
        isRunning: true,
      });
    }
  }

  // Get from database
  const scan = await getScanHistory(scanId);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...scan,
    isRunning: false,
    errors: scan.errors ? JSON.parse(scan.errors) : [],
  });
}
