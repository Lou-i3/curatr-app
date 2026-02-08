/**
 * FFprobe integration status API
 * GET /api/ffprobe/status - Get FFprobe availability and analysis statistics
 */

import { NextResponse } from 'next/server';
import { getFFprobeStatus } from '@/lib/ffprobe';

export async function GET() {
  try {
    const status = await getFFprobeStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('FFprobe status error:', error);
    return NextResponse.json(
      { error: 'Failed to get FFprobe status' },
      { status: 500 }
    );
  }
}
