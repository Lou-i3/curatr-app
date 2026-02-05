/**
 * GET /api/scan/[id]/progress - SSE stream for live progress updates
 */

import { NextRequest } from 'next/server';
import { getScanProgress, isScanActive } from '@/lib/scanner';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const scanId = parseInt(id, 10);

  if (isNaN(scanId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid scan ID' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!isScanActive(scanId)) {
    return new Response(
      JSON.stringify({ error: 'Scan not found or already completed' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const tracker = getScanProgress(scanId);
  if (!tracker) {
    return new Response(
      JSON.stringify({ error: 'Scan tracker not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to progress updates
      const unsubscribe = tracker.subscribe((progress) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));

        // Close stream when complete
        if (progress.phase === 'complete') {
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
