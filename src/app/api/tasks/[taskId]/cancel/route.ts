/**
 * Task cancel API route
 * POST /api/tasks/[taskId]/cancel - Request cancellation of a running task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskTracker, requestCancellation } from '@/lib/tasks';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { taskId } = await params;

  const tracker = getTaskTracker(taskId);

  if (!tracker) {
    return NextResponse.json(
      { error: 'Task not found' },
      { status: 404 }
    );
  }

  const progress = tracker.getProgress();

  if (progress.status !== 'running') {
    return NextResponse.json(
      { error: 'Task is not running', status: progress.status },
      { status: 400 }
    );
  }

  const cancelled = requestCancellation(taskId);

  if (!cancelled) {
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Cancellation requested',
    taskId,
  });
}
