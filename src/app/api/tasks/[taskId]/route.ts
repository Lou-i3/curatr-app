/**
 * Task status API route
 * GET /api/tasks/[taskId] - Get status of a specific task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskTracker } from '@/lib/tasks';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { taskId } = await params;

  const tracker = getTaskTracker(taskId);

  if (!tracker) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(tracker.getSerialized());
}
