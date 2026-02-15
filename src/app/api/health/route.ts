/**
 * Health API — lightweight status check for orchestrators and monitoring tools.
 * Unauthenticated by design (Docker healthchecks, Kubernetes probes, Uptime Kuma, etc.)
 *
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns app version, database connectivity, and uptime. No authentication required.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded]
 *                 version:
 *                   type: string
 *                   example: "0.9.0"
 *                 uptime:
 *                   type: integer
 *                   description: Process uptime in seconds
 *                 database:
 *                   type: string
 *                   enum: [connected, unreachable]
 *       503:
 *         description: Application is unhealthy (database unreachable)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [unhealthy]
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: integer
 *                 database:
 *                   type: string
 *                   enum: [unreachable]
 *                 error:
 *                   type: string
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import packageJson from '../../../../package.json';

export async function GET() {
  let dbStatus: 'connected' | 'unreachable' = 'unreachable';

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    dbStatus = 'connected';
  } catch {
    // DB unreachable
  }

  const healthy = dbStatus === 'connected';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'unhealthy',
      version: packageJson.version,
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
    },
    { status: healthy ? 200 : 503 },
  );
}
