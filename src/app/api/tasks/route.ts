/**
 * Tasks API route
 * GET /api/tasks - List all active tasks
 */

import { NextResponse } from 'next/server';
import { getActiveTasks } from '@/lib/tasks';

export async function GET() {
  const tasks = getActiveTasks();

  return NextResponse.json({
    tasks,
    count: tasks.length,
  });
}
