/**
 * POST /api/scan - Start a new scan
 * GET /api/scan - List recent scans
 */

import { NextRequest, NextResponse } from 'next/server';
import { startScan, getRecentScans } from '@/lib/scanner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const { scanId, taskId } = await startScan({
      scanType: body.scanType ?? 'full',
      skipMetadata: body.skipMetadata ?? true, // Skip ffprobe for now
      concurrency: body.concurrency ?? 4,
    });

    return NextResponse.json({
      scanId,
      taskId,
      status: 'started',
      message: 'Scan started successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start scan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scans = await getRecentScans(20);
    return NextResponse.json(scans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
