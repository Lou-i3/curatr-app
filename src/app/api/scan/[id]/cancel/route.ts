/**
 * POST /api/scan/[id]/cancel - Cancel a running scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { cancelScan, isScanActive } from '@/lib/scanner';
import { checkAdmin } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const { id } = await params;
  const scanId = parseInt(id, 10);

  if (isNaN(scanId)) {
    return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
  }

  if (!isScanActive(scanId)) {
    return NextResponse.json(
      { error: 'Scan is not running or does not exist' },
      { status: 404 }
    );
  }

  const cancelled = cancelScan(scanId);

  if (cancelled) {
    return NextResponse.json({ status: 'cancelled', scanId });
  } else {
    return NextResponse.json(
      { error: 'Failed to cancel scan' },
      { status: 500 }
    );
  }
}
