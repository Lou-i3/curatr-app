/**
 * Library Health section — 4 stat cards showing key metrics
 * Visible to all users
 */

import { Tv, Film, HardDrive, HeartPulse } from 'lucide-react';
import { formatFileSize } from '@/lib/format';
import { StatCard } from './stat-card';

interface LibraryHealthProps {
  showCount: number;
  episodeCount: number;
  fileCount: number;
  totalSize: bigint | null;
  healthPercent: number;
  healthLabel: string;
}

function getHealthVariant(percent: number): 'success' | 'warning' | 'destructive' | 'default' {
  if (percent > 80) return 'success';
  if (percent >= 50) return 'warning';
  if (percent >= 0) return 'destructive';
  return 'default';
}

export function LibraryHealth({
  showCount,
  episodeCount,
  fileCount,
  totalSize,
  healthPercent,
  healthLabel,
}: LibraryHealthProps) {
  return (
    <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4 mb-6 md:mb-8">
      <StatCard
        title="TV Shows"
        value={showCount}
        subtitle="shows in library"
        icon={Tv}
      />
      <StatCard
        title="Episodes"
        value={episodeCount}
        subtitle={`${fileCount} files tracked`}
        icon={Film}
      />
      <StatCard
        title="Library Size"
        value={totalSize ? formatFileSize(totalSize) : '0 B'}
        subtitle={`${fileCount} files`}
        icon={HardDrive}
      />
      <StatCard
        title="Library Health"
        value={fileCount > 0 ? `${healthPercent}%` : '—'}
        subtitle={fileCount > 0 ? healthLabel : 'No files to evaluate'}
        icon={HeartPulse}
        variant={fileCount > 0 ? getHealthVariant(healthPercent) : 'default'}
      />
    </div>
  );
}
