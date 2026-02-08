/**
 * Task cancel API route
 * POST /api/tasks/[taskId]/cancel - Request cancellation of a running task
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTaskTracker,
  requestCancellation,
  terminateWorker,
  scheduleCleanup,
  type ScanTaskProgress,
} from '@/lib/tasks';
import { cancelScan } from '@/lib/scanner/scan';
import { checkAdmin } from '@/lib/auth';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await checkAdmin();
  if (authError) return authError;

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

  // Handle different task types
  if (progress.type === 'scan') {
    // For scans, use the scanner's cancellation mechanism
    const scanProgress = progress as ScanTaskProgress;
    cancelScan(scanProgress.scanId);
    // The scan will mark itself as cancelled when it checks the flag
  } else {
    // For worker-based tasks, terminate the worker
    terminateWorker(taskId);
    // Mark the task as cancelled immediately
    tracker.cancel();
    scheduleCleanup(taskId);
  }

  // Request cancellation flag (used by some tasks)
  requestCancellation(taskId);

  return NextResponse.json({
    success: true,
    message: 'Task cancelled',
    taskId,
  });
}
