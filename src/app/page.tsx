/**
 * Dashboard page — role-aware overview of the media library
 * Server component that fetches all stats, passes to client sections
 */

import { prisma } from '@/lib/prisma';
import { PageContainer } from '@/components/layout';
import { getSession } from '@/lib/auth';
import { isFFprobeConfigured } from '@/lib/ffprobe/config';
import { formatFileSize } from '@/lib/format';
import { DashboardClient } from './dashboard/dashboard-client';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const [
    showCount,
    episodeCount,
    fileCount,
    qualityGroups,
    actionGroups,
    codecGroups,
    resolutionGroups,
    hdrGroups,
    totalSizeResult,
    recentScans,
    tmdbMatchedCount,
    analyzedFilesCount,
  ] = await Promise.all([
    prisma.tVShow.count(),
    prisma.episode.count(),
    prisma.episodeFile.count({ where: { fileExists: true } }),

    prisma.episodeFile.groupBy({
      by: ['quality'],
      _count: { quality: true },
      where: { fileExists: true },
    }),

    prisma.episodeFile.groupBy({
      by: ['action'],
      _count: { action: true },
      where: { fileExists: true, action: { not: 'NOTHING' } },
    }),

    prisma.episodeFile.groupBy({
      by: ['codec'],
      _count: { codec: true },
      where: { fileExists: true, codec: { not: null } },
      orderBy: { _count: { codec: 'desc' } },
      take: 10,
    }),

    prisma.episodeFile.groupBy({
      by: ['resolution'],
      _count: { resolution: true },
      where: { fileExists: true, resolution: { not: null } },
      orderBy: { _count: { resolution: 'desc' } },
      take: 10,
    }),

    prisma.episodeFile.groupBy({
      by: ['hdrType'],
      _count: { hdrType: true },
      where: { fileExists: true, hdrType: { not: null } },
    }),

    prisma.episodeFile.aggregate({
      _sum: { fileSize: true },
      where: { fileExists: true },
    }),

    prisma.scanHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),

    prisma.tVShow.count({ where: { tmdbId: { not: null } } }),

    prisma.episodeFile.count({
      where: { fileExists: true, mediaInfoExtractedAt: { not: null }, mediaInfoError: null },
    }),
  ]);

  // Compute health score: (VERIFIED + OK) / total * 100
  const okCount = qualityGroups
    .filter((g) => g.quality === 'OK' || g.quality === 'VERIFIED')
    .reduce((sum, g) => sum + g._count.quality, 0);
  const healthPercent = fileCount > 0 ? Math.round((okCount / fileCount) * 100) : 0;

  return {
    library: {
      showCount,
      episodeCount,
      fileCount,
      totalSizeFormatted: totalSizeResult._sum.fileSize
        ? formatFileSize(totalSizeResult._sum.fileSize)
        : '0 B',
      healthPercent,
      healthLabel: `${okCount} of ${fileCount} verified`,
    },
    qualityData: qualityGroups.map((g) => ({ quality: g.quality, count: g._count.quality })),
    actionData: actionGroups.map((g) => ({ action: g.action, count: g._count.action })),
    codecs: codecGroups.map((g) => ({ name: g.codec || 'Unknown', count: g._count.codec })),
    resolutions: resolutionGroups.map((g) => ({ name: g.resolution || 'Unknown', count: g._count.resolution })),
    hdr: hdrGroups.map((g) => ({ name: g.hdrType || 'Unknown', count: g._count.hdrType })),
    recentScans: recentScans.map((s) => ({
      id: s.id,
      scanType: s.scanType,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() || null,
      filesScanned: s.filesScanned,
      filesAdded: s.filesAdded,
      filesUpdated: s.filesUpdated,
      filesDeleted: s.filesDeleted,
    })),
    tmdb: { matchedCount: tmdbMatchedCount, totalShows: showCount },
    analyzedFiles: analyzedFilesCount,
    ffprobeAvailable: isFFprobeConfigured(),
  };
}

export default async function Home() {
  const [stats, session] = await Promise.all([getDashboardStats(), getSession()]);
  const username = session?.user?.username || null;

  return (
    <PageContainer maxWidth="wide">
      {/* All sections managed by client — greeting, stats, then content */}
      <DashboardClient
        username={username}
        libraryHealth={stats.library}
        recentScans={stats.recentScans}
        qualityData={stats.qualityData}
        actionData={stats.actionData}
        codecs={stats.codecs}
        resolutions={stats.resolutions}
        hdr={stats.hdr}
        totalFiles={stats.library.fileCount}
        tmdbMatchedCount={stats.tmdb.matchedCount}
        totalShows={stats.tmdb.totalShows}
        analyzedFiles={stats.analyzedFiles}
        ffprobeAvailable={stats.ffprobeAvailable}
      />
    </PageContainer>
  );
}
