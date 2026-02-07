/**
 * Task progress SSE endpoint
 * GET /api/tasks/[taskId]/progress - Stream real-time progress updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTaskTracker, serializeProgress } from '@/lib/tasks';

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { taskId } = await params;

  const tracker = getTaskTracker(taskId);

  if (!tracker) {
    return NextResponse.json(
      { error: 'Task not found or already completed' },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Track unsubscribe function
      let unsubscribeFn: (() => void) | null = null;
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribeFn?.();
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      };

      // Subscribe to progress updates
      unsubscribeFn = tracker.subscribe((progress) => {
        if (closed) return;

        const serialized = serializeProgress(progress);
        const data = `data: ${JSON.stringify(serialized)}\n\n`;

        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller may be closed
          cleanup();
          return;
        }

        // Close stream when task is complete (not just not-running, since pending is valid)
        if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
          cleanup();
        }
      });

      // Clean up on client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
