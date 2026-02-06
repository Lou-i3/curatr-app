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
      // Subscribe to progress updates
      const unsubscribe = tracker.subscribe((progress) => {
        const serialized = serializeProgress(progress);
        const data = `data: ${JSON.stringify(serialized)}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Close stream when task is no longer running
        if (progress.status !== 'running') {
          unsubscribe();
          controller.close();
        }
      });

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
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
